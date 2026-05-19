import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import Field, Relationship, SQLModel


class TicketType(SQLModel, table=True):
    __tablename__ = "ticket_types"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    event_id: uuid.UUID = Field(foreign_key="events.id")
    name: str
    description: str = ""
    inventory_total: Optional[int] = None
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    event: Optional["Event"] = Relationship(back_populates="ticket_types")
    price_bands: List["PriceBand"] = Relationship(
        back_populates="ticket_type",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    order_items: List["OrderItem"] = Relationship(back_populates="ticket_type")
