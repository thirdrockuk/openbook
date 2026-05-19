import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, List
from sqlmodel import Field, Relationship, SQLModel


class OrderStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    refunded = "refunded"
    expired = "expired"


class Order(SQLModel, table=True):
    __tablename__ = "orders"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    event_id: uuid.UUID = Field(foreign_key="events.id")
    order_number: str
    booker_name: str
    booker_email: str
    booker_phone: Optional[str] = None
    status: OrderStatus = OrderStatus.pending
    total_pence: int = 0
    currency: str = "GBP"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    confirmed_at: Optional[datetime] = None
    expires_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    view_token: uuid.UUID = Field(default_factory=uuid.uuid4)

    event: Optional["Event"] = Relationship(back_populates="orders")
    order_items: List["OrderItem"] = Relationship(
        back_populates="order",
        sa_relationship_kwargs={"order_by": "OrderItem.created_at.asc()"},
    )
    payments: List["Payment"] = Relationship(back_populates="order")
