import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import Field, Relationship, SQLModel


class PriceBand(SQLModel, table=True):
    __tablename__ = "price_bands"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    ticket_type_id: uuid.UUID = Field(foreign_key="ticket_types.id")
    label: str
    age_min: int
    age_max: int
    price_pence: int
    venue_fee_pence: int = 0
    qualifier: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    ticket_type: Optional["TicketType"] = Relationship(back_populates="price_bands")
    order_items: List["OrderItem"] = Relationship(back_populates="price_band")
