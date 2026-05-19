from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func

from app.database import get_session
from app.models.admin_user import AdminUser
from app.models.event import Event
from app.models.order import Order, OrderStatus
from app.routers.auth import get_current_admin_user

router = APIRouter()


@router.get("/dashboard")
def get_dashboard(
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    total_events = session.exec(select(func.count(Event.id))).one()
    total_orders = session.exec(select(func.count(Order.id))).one()
    confirmed_orders = session.exec(
        select(func.count(Order.id)).where(Order.status == OrderStatus.confirmed)
    ).one()
    total_revenue = session.exec(
        select(func.coalesce(func.sum(Order.total_pence), 0)).where(
            Order.status == OrderStatus.confirmed
        )
    ).one()

    return {
        "total_events": total_events,
        "total_orders": total_orders,
        "confirmed_orders": confirmed_orders,
        "total_revenue_pence": total_revenue,
    }
