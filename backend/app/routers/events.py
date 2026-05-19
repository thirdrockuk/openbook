import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models.event import Event, EventStatus
from app.models.ticket_type import TicketType
from app.schemas.event import EventReadWithTicketTypes
from app.schemas.ticket_type import TicketTypeWithAvailability
from app.services.inventory import get_available_inventory

router = APIRouter(prefix="/events", tags=["events"])


@router.get("", response_model=List[EventReadWithTicketTypes])
def list_events(session: Session = Depends(get_session)):
    events = session.exec(
        select(Event).where(Event.status == EventStatus.published)
    ).all()
    return events


@router.get("/{event_id}", response_model=EventReadWithTicketTypes)
def get_event(event_id: uuid.UUID, session: Session = Depends(get_session)):
    event = session.get(Event, event_id)
    if not event or event.status != EventStatus.published:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
