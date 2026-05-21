import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func

from app.database import get_session
from app.models.admin_user import AdminUser
from app.models.order import Order, OrderStatus
from app.models.order_item import OrderItem
from app.models.price_band import PriceBand
from app.models.payment import Payment, PaymentStatus
from app.schemas.order import (
    OrderItemPriceUpdate,
    OrderItemRequirementsUpdate,
    OrderReadAdmin,
)

from app.schemas.payment import PaymentCreate
from app.routers.auth import get_current_admin_user
from app.routers.admin._helpers import _order_to_admin_read
from app.services.orders import cancel_order

router = APIRouter()


@router.get("/orders/{order_id}", response_model=OrderReadAdmin)
def get_order(
    order_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _order_to_admin_read(order)


@router.post("/orders/{order_id}/cancel", response_model=OrderReadAdmin)
def admin_cancel_order(
    order_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    try:
        order = cancel_order(session, order_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _order_to_admin_read(order)


@router.put("/orders/{order_id}/items/{item_id}/price", response_model=OrderReadAdmin)
def admin_update_order_item_price(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    data: OrderItemPriceUpdate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status not in (OrderStatus.pending, OrderStatus.confirmed):
        raise HTTPException(
            status_code=400,
            detail="Can only update attendee prices for pending or confirmed orders",
        )

    item = session.exec(
        select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    item.price_pence = data.price_pence
    session.add(item)
    session.flush()

    recalculated_total = session.exec(
        select(func.coalesce(func.sum(OrderItem.price_pence), 0)).where(OrderItem.order_id == order_id)
    ).one()
    order.total_pence = int(recalculated_total)
    session.add(order)
    session.commit()
    session.refresh(order)

    return _order_to_admin_read(order)


@router.post("/orders/{order_id}/items/{item_id}/price/reset", response_model=OrderReadAdmin)
def admin_reset_order_item_price(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order.status not in (OrderStatus.pending, OrderStatus.confirmed):
        raise HTTPException(
            status_code=400,
            detail="Can only update attendee prices for pending or confirmed orders",
        )

    item = session.exec(
        select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    price_band = item.price_band or session.get(PriceBand, item.price_band_id)
    if not price_band:
        raise HTTPException(status_code=400, detail="Cannot resolve standard price for this attendee")

    if price_band.price_pence < item.venue_fee_pence:
        raise HTTPException(
            status_code=400,
            detail="Standard price is now lower than the venue fee; set a manual price instead",
        )

    item.price_pence = price_band.price_pence
    session.add(item)
    session.flush()

    recalculated_total = session.exec(
        select(func.coalesce(func.sum(OrderItem.price_pence), 0)).where(OrderItem.order_id == order_id)
    ).one()
    order.total_pence = int(recalculated_total)
    session.add(order)
    session.commit()
    session.refresh(order)

    return _order_to_admin_read(order)


@router.put("/orders/{order_id}/items/{item_id}/requirements", response_model=OrderReadAdmin)
def admin_update_order_item_requirements(
    order_id: uuid.UUID,
    item_id: uuid.UUID,
    data: OrderItemRequirementsUpdate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    item = session.exec(
        select(OrderItem).where(OrderItem.id == item_id, OrderItem.order_id == order_id)
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    item.dietary_requirements = data.dietary_requirements
    item.access_requirements = data.access_requirements
    session.add(item)
    session.commit()
    session.refresh(order)

    return _order_to_admin_read(order)


@router.post("/orders/{order_id}/payments", response_model=OrderReadAdmin, status_code=201)
def record_payment(
    order_id: uuid.UUID,
    data: PaymentCreate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    order = session.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status == OrderStatus.cancelled:
        raise HTTPException(status_code=400, detail="Cannot record payment for a cancelled order")

    payment = Payment(
        order_id=order_id,
        provider=data.method,
        provider_txn_id=data.reference,
        note=data.note,
        amount_pence=data.amount_pence,
        currency=order.currency,
        status=PaymentStatus.succeeded,
        received_at=data.received_at,
    )
    session.add(payment)
    session.commit()
    session.refresh(order)
    return _order_to_admin_read(order)


@router.delete("/orders/{order_id}/payments/{payment_id}", status_code=204)
def delete_payment(
    order_id: uuid.UUID,
    payment_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    payment = session.exec(
        select(Payment).where(Payment.id == payment_id, Payment.order_id == order_id)
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    session.delete(payment)
    session.commit()
