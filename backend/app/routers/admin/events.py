import uuid
from typing import List, Optional, Literal
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, func

from app.database import get_session
from app.models.admin_user import AdminUser
from app.models.event import Event
from app.models.order import Order, OrderStatus
from app.schemas.event import EventCreate, EventUpdate, EventRead, EventReadWithTicketTypes
from app.schemas.order import (
    EventAttendeeReport,
    EventAttendeeReportAttendee,
    EventAttendeeReportSettings,
    EventAttendeeReportSettingsUpdate,
    OrderReadAdminPaginated,
)
from app.routers.auth import get_current_admin_user
from app.routers.admin._helpers import _order_to_admin_read, _parse_event_attendee_report_age_tabs
from app.services.pricing import age_at_event

router = APIRouter()

SORTABLE_ORDER_COLUMNS = {
    "created_at": Order.created_at,
    "order_number": Order.order_number,
    "booker_name": Order.booker_name,
    "total_pence": Order.total_pence,
    "status": Order.status,
}


@router.get("/events", response_model=List[EventReadWithTicketTypes])
def list_all_events(
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    events = session.exec(select(Event)).all()
    counts_rows = session.exec(
        select(Order.event_id, func.count(Order.id))
        .where(Order.status != OrderStatus.cancelled)
        .group_by(Order.event_id)
    ).all()
    counts = {str(event_id): n for event_id, n in counts_rows}
    result = []
    for event in events:
        item = EventReadWithTicketTypes.model_validate(event)
        item.order_count = counts.get(str(event.id), 0)
        result.append(item)
    return result


@router.post("/events", response_model=EventRead)
def create_event(
    data: EventCreate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    event = Event(**data.model_dump())
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.get("/events/{event_id}", response_model=EventReadWithTicketTypes)
def get_event(
    event_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.put("/events/{event_id}", response_model=EventRead)
def update_event(
    event_id: uuid.UUID,
    data: EventUpdate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)
    event.updated_at = datetime.now(timezone.utc)
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.delete("/events/{event_id}")
def delete_event(
    event_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    session.delete(event)
    session.commit()
    return {"ok": True}


@router.get("/events/{event_id}/orders/paginated", response_model=OrderReadAdminPaginated)
def list_event_orders_paginated(
    event_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1),
    sort_dir: Literal["desc", "asc"] = "desc",
    sort_col: Literal["created_at", "order_number", "booker_name", "total_pence", "status"] = "created_at",
    search: Optional[str] = Query(default=None, max_length=200),
    include_cancelled: bool = Query(default=False),
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    count_query = select(func.count(Order.id)).where(Order.event_id == event_id)
    if not include_cancelled:
        count_query = count_query.where(Order.status != OrderStatus.cancelled)
    if search:
        count_query = count_query.where(Order.booker_name.ilike(f"%{search}%"))
    total = session.exec(count_query).one()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    col = SORTABLE_ORDER_COLUMNS[sort_col]
    order_expression = col.desc() if sort_dir == "desc" else col.asc()
    tie_breaker = Order.id.desc() if sort_dir == "desc" else Order.id.asc()
    offset = (page - 1) * page_size

    data_query = (
        select(Order)
        .where(Order.event_id == event_id)
        .order_by(order_expression, tie_breaker)
        .offset(offset)
        .limit(page_size)
    )
    if not include_cancelled:
        data_query = data_query.where(Order.status != OrderStatus.cancelled)
    if search:
        data_query = data_query.where(Order.booker_name.ilike(f"%{search}%"))
    orders = session.exec(data_query).all()

    return OrderReadAdminPaginated(
        items=[_order_to_admin_read(o) for o in orders],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/events/{event_id}/attendee-report", response_model=EventAttendeeReport)
def get_event_attendee_report(
    event_id: uuid.UUID,
    include_pending: bool = False,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    included_statuses = [OrderStatus.confirmed]
    if include_pending:
        included_statuses.append(OrderStatus.pending)

    orders = session.exec(
        select(Order).where(Order.event_id == event_id, Order.status.in_(included_statuses))
    ).all()

    event_start_date = event.starts_at.date()
    attendees: List[EventAttendeeReportAttendee] = []
    for order in orders:
        for item in order.order_items:
            attendees.append(
                EventAttendeeReportAttendee(
                    order_id=order.id,
                    order_number=order.order_number,
                    order_status=order.status,
                    booker_name=order.booker_name,
                    booker_email=order.booker_email,
                    attendee_name=item.attendee_name,
                    attendee_dob=item.attendee_dob,
                    attendee_age=age_at_event(item.attendee_dob, event_start_date),
                    ticket_type_id=item.ticket_type_id,
                    ticket_type_name=item.ticket_type.name if item.ticket_type else None,
                    price_band_label=item.price_band.label if item.price_band else None,
                    price_band_qualifier=item.price_band.qualifier if item.price_band else None,
                    price_pence=item.price_pence,
                    venue_fee_pence=item.venue_fee_pence,
                )
            )

    attendees.sort(key=lambda a: (a.attendee_age, a.attendee_name.casefold()))

    return EventAttendeeReport(
        event_id=event.id,
        event_title=event.title,
        event_starts_at=event.starts_at,
        age_tabs=_parse_event_attendee_report_age_tabs(event.attendee_report_age_tabs),
        attendees=attendees,
    )


@router.put("/events/{event_id}/attendee-report/settings", response_model=EventAttendeeReportSettings)
def update_event_attendee_report_settings(
    event_id: uuid.UUID,
    data: EventAttendeeReportSettingsUpdate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    event.attendee_report_age_tabs = [tab.model_dump() for tab in data.age_tabs]
    event.updated_at = datetime.now(timezone.utc)
    session.add(event)
    session.commit()
    session.refresh(event)

    return EventAttendeeReportSettings(
        event_id=event.id,
        age_tabs=_parse_event_attendee_report_age_tabs(event.attendee_report_age_tabs),
    )
