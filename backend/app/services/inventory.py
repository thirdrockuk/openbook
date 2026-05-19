from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Session, select, func
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.ticket_type import TicketType


def get_available_inventory(
    session: Session, ticket_type: TicketType
) -> Optional[int]:
    """
    Returns available inventory for a ticket type.
    Returns None if inventory is unlimited.
    Pending orders hold inventory until expires_at.
    """
    if ticket_type.inventory_total is None:
        return None

    now = datetime.now(timezone.utc)
    active_statuses = [OrderStatus.pending, OrderStatus.confirmed]

    held_count = session.exec(
        select(func.count(OrderItem.id))
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            OrderItem.ticket_type_id == ticket_type.id,
            Order.status.in_(active_statuses),
            Order.expires_at > now,
        )
    ).one()

    return ticket_type.inventory_total - held_count


def check_inventory_available(
    session: Session, ticket_type_id, quantity: int
) -> bool:
    """Check if the requested quantity is available."""
    from app.models.ticket_type import TicketType

    ticket_type = session.get(TicketType, ticket_type_id)
    if not ticket_type:
        return False

    available = get_available_inventory(session, ticket_type)
    if available is None:
        return True

    return available >= quantity
