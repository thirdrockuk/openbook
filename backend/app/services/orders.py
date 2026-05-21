import uuid
from datetime import datetime, timezone, timedelta
from typing import List
from sqlmodel import Session, select, func

from app.models.event import Event
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem

from app.models.ticket_type import TicketType
from app.schemas.order import OrderCreate
from app.services.pricing import resolve_price_band
from app.services.inventory import check_inventory_available


def generate_order_number(session: Session, event: Event) -> str:
    """Generate a per-event order number. With prefix: GBBO-00001. Without: 00001."""
    count = session.exec(
        select(func.count(Order.id)).where(Order.event_id == event.id)
    ).one()
    seq = f"{count + 1:05d}"
    if event.order_number_prefix:
        return f"{event.order_number_prefix}-{seq}"
    return seq


def create_order(session: Session, data: OrderCreate) -> Order:
    """Create a new pending order with all attendee items."""
    event = session.get(Event, data.event_id)
    if not event:
        raise ValueError("Event not found")

    # Count attendees per ticket type for inventory check
    from collections import Counter
    ticket_counts = Counter(str(a.ticket_type_id) for a in data.attendees)
    for ticket_type_id_str, qty in ticket_counts.items():
        ticket_type_id = uuid.UUID(ticket_type_id_str)
        if not check_inventory_available(session, ticket_type_id, qty):
            ticket_type = session.get(TicketType, ticket_type_id)
            name = ticket_type.name if ticket_type else ticket_type_id_str
            raise ValueError(f"Not enough inventory for ticket type: {name}")

    order = Order(
        event_id=data.event_id,
        order_number=generate_order_number(session, event),
        booker_name=data.booker_name,
        booker_email=data.booker_email,
        booker_phone=data.booker_phone,
        payment_method=data.payment_method,
        status=OrderStatus.pending,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
    )
    session.add(order)
    session.flush()

    total_pence = 0
    event_start_date = event.starts_at.date()

    for attendee in data.attendees:
        ticket_type = session.get(TicketType, attendee.ticket_type_id)
        if not ticket_type:
            raise ValueError(f"Ticket type not found: {attendee.ticket_type_id}")

        price_band = resolve_price_band(
            attendee.attendee_dob, event_start_date, ticket_type.price_bands,
            is_student=attendee.is_student,
        )
        if not price_band:
            raise ValueError(
                f"No price band found for attendee {attendee.attendee_name} "
                f"(DOB: {attendee.attendee_dob})"
            )

        item = OrderItem(
            order_id=order.id,
            ticket_type_id=attendee.ticket_type_id,
            price_band_id=price_band.id,
            attendee_name=attendee.attendee_name,
            attendee_dob=attendee.attendee_dob,
            dietary_requirements=attendee.dietary_requirements,
            access_requirements=attendee.access_requirements,
            price_pence=price_band.price_pence,
            venue_fee_pence=price_band.venue_fee_pence,
        )
        session.add(item)
        total_pence += price_band.price_pence

    order.total_pence = total_pence
    session.add(order)
    session.commit()
    session.refresh(order)
    return order


def confirm_order(session: Session, order_id: uuid.UUID) -> Order:
    """Confirm order: check status, inventory, send confirmation email."""
    from app.services.email import send_booking_confirmation

    order = session.get(Order, order_id)
    if not order:
        raise ValueError("Order not found")

    if order.status != OrderStatus.pending:
        raise ValueError(f"Order is not in pending status (current: {order.status})")

    now = datetime.now(timezone.utc)
    if order.expires_at < now:
        order.status = OrderStatus.expired
        session.add(order)
        session.commit()
        raise ValueError("Order has expired")

    order.status = OrderStatus.confirmed
    order.confirmed_at = now
    # Extend expires_at so confirmed orders aren't cleaned up
    order.expires_at = now + timedelta(days=365)
    session.add(order)
    session.commit()
    session.refresh(order)

    # Send confirmation email
    try:
        send_booking_confirmation(order, session)
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to send confirmation email: {e}")

    return order


def cancel_order(session: Session, order_id: uuid.UUID) -> Order:
    """Cancel an order and release inventory."""
    order = session.get(Order, order_id)
    if not order:
        raise ValueError("Order not found")

    if order.status in [OrderStatus.cancelled, OrderStatus.refunded]:
        raise ValueError(f"Order already cancelled/refunded")

    order.status = OrderStatus.cancelled
    session.add(order)
    session.commit()
    session.refresh(order)
    return order
