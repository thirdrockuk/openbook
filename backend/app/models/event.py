import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List
from sqlmodel import Field, Relationship, SQLModel
from sqlalchemy import Column, JSON


class EventStatus(str, Enum):
    draft = "draft"
    published = "published"
    cancelled = "cancelled"


class Event(SQLModel, table=True):
    __tablename__ = "events"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    title: str
    description: str = ""
    location: str = ""
    starts_at: datetime
    ends_at: datetime
    status: EventStatus = EventStatus.draft
    sales_start_at: Optional[datetime] = None
    sales_end_at: Optional[datetime] = None
    banner_image_url: Optional[str] = None
    order_number_prefix: Optional[str] = None
    attendee_report_age_tabs: List[dict] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
    )
    price_band_template: List[dict] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
    )
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    ticket_types: List["TicketType"] = Relationship(back_populates="event")
    orders: List["Order"] = Relationship(back_populates="event")
