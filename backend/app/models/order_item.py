import uuid
from datetime import datetime, timezone, date
from typing import Optional
from sqlmodel import Field, Relationship, SQLModel


class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    order_id: uuid.UUID = Field(foreign_key="orders.id")
    ticket_type_id: uuid.UUID = Field(foreign_key="ticket_types.id")
    price_band_id: uuid.UUID = Field(foreign_key="price_bands.id")
    attendee_name: str
    attendee_dob: date
    dietary_requirements: Optional[str] = None
    access_requirements: Optional[str] = None
    price_pence: int
    venue_fee_pence: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    order: Optional["Order"] = Relationship(back_populates="order_items")
    ticket_type: Optional["TicketType"] = Relationship(back_populates="order_items")
    price_band: Optional["PriceBand"] = Relationship(back_populates="order_items")
