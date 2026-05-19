import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, func

from app.database import get_session
from app.models.ticket_type import TicketType
from app.models.price_band import PriceBand
from app.models.order_item import OrderItem
from app.models.event import Event
from app.schemas.ticket_type import TicketTypeCreate, TicketTypeUpdate, TicketTypeWithAvailability
from app.services.inventory import get_available_inventory
from app.routers.auth import get_current_admin_user
from app.models.admin_user import AdminUser
from datetime import datetime, timezone

router = APIRouter(tags=["ticket_types"])


@router.get("/admin/events/{event_id}/ticket-types", response_model=List[TicketTypeWithAvailability])
def list_ticket_types(
    event_id: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    ticket_types = session.exec(
        select(TicketType).where(TicketType.event_id == event_id)
    ).all()
    result = []
    for tt in ticket_types:
        available = get_available_inventory(session, tt)
        item = TicketTypeWithAvailability(
            **tt.model_dump(),
            price_bands=tt.price_bands,
            available=available,
        )
        result.append(item)
    return result


@router.post("/admin/events/{event_id}/ticket-types", response_model=TicketTypeWithAvailability)
def create_ticket_type(
    event_id: uuid.UUID,
    data: TicketTypeCreate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    event = session.get(Event, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    tt = TicketType(
        event_id=event_id,
        name=data.name,
        description=data.description,
        inventory_total=data.inventory_total,
        is_active=data.is_active,
        sort_order=data.sort_order,
    )
    session.add(tt)
    session.flush()

    for band_data in data.price_bands:
        band = PriceBand(
            ticket_type_id=tt.id,
            label=band_data.label,
            age_min=band_data.age_min,
            age_max=band_data.age_max,
            price_pence=band_data.price_pence,
            venue_fee_pence=band_data.venue_fee_pence,
            qualifier=band_data.qualifier,
        )
        session.add(band)

    session.commit()
    session.refresh(tt)

    available = get_available_inventory(session, tt)
    return TicketTypeWithAvailability(**tt.model_dump(), price_bands=tt.price_bands, available=available)


@router.put("/admin/events/{event_id}/ticket-types/{tid}", response_model=TicketTypeWithAvailability)
def update_ticket_type(
    event_id: uuid.UUID,
    tid: uuid.UUID,
    data: TicketTypeUpdate,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    tt = session.exec(
        select(TicketType).where(TicketType.id == tid, TicketType.event_id == event_id)
    ).first()
    if not tt:
        raise HTTPException(status_code=404, detail="Ticket type not found")

    update_fields = data.model_dump(exclude_unset=True, exclude={"price_bands"})
    for key, value in update_fields.items():
        setattr(tt, key, value)
    tt.updated_at = datetime.now(timezone.utc)
    session.add(tt)

    if data.price_bands is not None:
        existing_bands = session.exec(
            select(PriceBand).where(PriceBand.ticket_type_id == tid)
        ).all()

        # Index existing bands by (age_min, age_max, qualifier) for in-place update
        existing_by_key = {
            (b.age_min, b.age_max, b.qualifier): b for b in existing_bands
        }
        incoming_keys = set()

        for band_data in data.price_bands:
            key = (band_data.age_min, band_data.age_max, band_data.qualifier)
            incoming_keys.add(key)
            if key in existing_by_key:
                # Update in place — preserves the ID so order_items FK refs stay valid
                existing = existing_by_key[key]
                existing.label = band_data.label
                existing.price_pence = band_data.price_pence
                existing.venue_fee_pence = band_data.venue_fee_pence
                existing.updated_at = datetime.now(timezone.utc)
                session.add(existing)
            else:
                session.add(PriceBand(
                    ticket_type_id=tt.id,
                    label=band_data.label,
                    age_min=band_data.age_min,
                    age_max=band_data.age_max,
                    price_pence=band_data.price_pence,
                    venue_fee_pence=band_data.venue_fee_pence,
                    qualifier=band_data.qualifier,
                ))

        # Only delete bands that are no longer in the incoming list AND have no order items
        for key, band in existing_by_key.items():
            if key not in incoming_keys:
                referenced = session.exec(
                    select(func.count(OrderItem.id)).where(OrderItem.price_band_id == band.id)
                ).one()
                if referenced == 0:
                    session.delete(band)

    session.commit()
    session.refresh(tt)

    available = get_available_inventory(session, tt)
    return TicketTypeWithAvailability(**tt.model_dump(), price_bands=tt.price_bands, available=available)


@router.delete("/admin/events/{event_id}/ticket-types/{tid}")
def delete_ticket_type(
    event_id: uuid.UUID,
    tid: uuid.UUID,
    session: Session = Depends(get_session),
    _: AdminUser = Depends(get_current_admin_user),
):
    tt = session.exec(
        select(TicketType).where(TicketType.id == tid, TicketType.event_id == event_id)
    ).first()
    if not tt:
        raise HTTPException(status_code=404, detail="Ticket type not found")
    session.delete(tt)
    session.commit()
    return {"ok": True}
