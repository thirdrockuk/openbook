from fastapi import APIRouter

from app.routers.admin import events, orders, dashboard

router = APIRouter(prefix="/admin", tags=["admin"])
router.include_router(events.router)
router.include_router(orders.router)
router.include_router(dashboard.router)
