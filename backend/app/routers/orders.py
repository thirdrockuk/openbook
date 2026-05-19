import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.schemas.order import OrderCreate, OrderRead, BookingView, BookingViewEvent, OrderItemRead
from app.schemas.payment import PaymentRead
from app.models.payment import PaymentStatus
from app.services.orders import create_order, confirm_order, cancel_order

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderRead)
def create_order_endpoint(data: OrderCreate, session: Session = Depends(get_session)):
    try:
        order = create_order(session, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return order


@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: uuid.UUID, session: Session = Depends(get_session)):
    from app.models.order import Order
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@router.post("/{order_id}/confirm", response_model=OrderRead)
def confirm_order_endpoint(order_id: uuid.UUID, session: Session = Depends(get_session)):
    try:
        order = confirm_order(session, order_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return order


@router.post("/{order_id}/cancel", response_model=OrderRead)
def cancel_order_endpoint(order_id: uuid.UUID, session: Session = Depends(get_session)):
    try:
        order = cancel_order(session, order_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return order


@router.get("/view/{view_token}", response_model=BookingView)
def get_booking_view(view_token: uuid.UUID, session: Session = Depends(get_session)):
    """Public endpoint — returns booking summary for the given view token."""
    from app.models.order import Order
    order = session.exec(
        select(Order).where(Order.view_token == view_token)
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Booking not found")

    amount_paid = sum(
        p.amount_pence for p in order.payments if p.status == PaymentStatus.succeeded
    )
    return BookingView(
        order_number=order.order_number,
        booker_name=order.booker_name,
        status=order.status,
        total_pence=order.total_pence,
        currency=order.currency,
        confirmed_at=order.confirmed_at,
        event=BookingViewEvent(
            title=order.event.title,
            location=order.event.location,
            starts_at=order.event.starts_at,
        ),
        order_items=[OrderItemRead.from_item(i) for i in order.order_items],
        payments=[PaymentRead.model_validate(p) for p in order.payments],
        amount_paid_pence=amount_paid,
        balance_pence=order.total_pence - amount_paid,
    )
