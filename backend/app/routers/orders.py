import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from app.database import get_session
from app.schemas.order import OrderCreate, OrderRead, BookingView, BookingViewEvent, OrderItemRead
from app.schemas.payment import PaymentRead
from app.models.payment import PaymentStatus
from app.services.orders import create_order, confirm_order, cancel_order
from app.config import settings

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


class ConfirmOrderBody(BaseModel):
    payment_intent_id: Optional[str] = None


@router.post("/{order_id}/confirm", response_model=OrderRead)
def confirm_order_endpoint(
    order_id: uuid.UUID,
    body: ConfirmOrderBody = ConfirmOrderBody(),
    session: Session = Depends(get_session),
):
    try:
        order = confirm_order(session, order_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Record Stripe payment automatically when a payment_intent_id is supplied
    if body.payment_intent_id and order.payment_method == "card":
        from app.models.payment import Payment, PaymentStatus
        from datetime import datetime, timezone
        payment = Payment(
            order_id=order.id,
            provider="card",
            provider_txn_id=body.payment_intent_id,
            amount_pence=order.total_pence,
            currency=order.currency,
            status=PaymentStatus.succeeded,
            received_at=datetime.now(timezone.utc),
        )
        session.add(payment)
        session.commit()

    return order


@router.post("/{order_id}/cancel", response_model=OrderRead)
def cancel_order_endpoint(order_id: uuid.UUID, session: Session = Depends(get_session)):
    try:
        order = cancel_order(session, order_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return order


@router.post("/{order_id}/payment-intent")
def create_payment_intent(order_id: uuid.UUID, session: Session = Depends(get_session)):
    import stripe
    from app.models.order import Order, OrderStatus

    if not settings.stripe_secret_key:
        raise HTTPException(status_code=503, detail="Card payment is not configured")

    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != OrderStatus.pending:
        raise HTTPException(status_code=400, detail="Order is not pending")
    if order.payment_method != "card":
        raise HTTPException(status_code=400, detail="Order payment method is not card")

    stripe.api_key = settings.stripe_secret_key
    intent = stripe.PaymentIntent.create(
        amount=order.total_pence,
        currency=order.currency.lower(),
        metadata={"order_id": str(order.id), "order_number": order.order_number},
    )
    return {"client_secret": intent.client_secret}


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
