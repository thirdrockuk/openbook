import uuid
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, Field as PydanticField, model_validator
from app.models.order import OrderStatus
from app.schemas.payment import PaymentRead


def _normalise_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    trimmed = value.strip()
    return trimmed or None


class AttendeeInput(BaseModel):
    ticket_type_id: uuid.UUID
    attendee_name: str
    attendee_dob: date
    is_student: bool = False
    dietary_requirements: Optional[str] = None
    access_requirements: Optional[str] = None

    @model_validator(mode="after")
    def normalise_requirements(self):
        self.dietary_requirements = _normalise_optional_text(self.dietary_requirements)
        self.access_requirements = _normalise_optional_text(self.access_requirements)
        return self


class OrderCreate(BaseModel):
    event_id: uuid.UUID
    booker_name: str
    booker_email: str
    booker_phone: Optional[str] = None
    payment_method: Optional[str] = None
    attendees: List[AttendeeInput]


class OrderItemRead(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    ticket_type_id: uuid.UUID
    ticket_type_name: Optional[str] = None
    price_band_id: uuid.UUID
    price_band_label: Optional[str] = None
    price_band_qualifier: Optional[str] = None
    attendee_name: str
    attendee_dob: date
    dietary_requirements: Optional[str] = None
    access_requirements: Optional[str] = None
    price_pence: int
    standard_price_pence: Optional[int] = None
    venue_fee_pence: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_item(cls, item) -> "OrderItemRead":
        return cls(
            id=item.id,
            order_id=item.order_id,
            ticket_type_id=item.ticket_type_id,
            ticket_type_name=item.ticket_type.name if item.ticket_type else None,
            price_band_id=item.price_band_id,
            price_band_label=item.price_band.label if item.price_band else None,
            price_band_qualifier=item.price_band.qualifier if item.price_band else None,
            attendee_name=item.attendee_name,
            attendee_dob=item.attendee_dob,
            dietary_requirements=item.dietary_requirements,
            access_requirements=item.access_requirements,
            price_pence=item.price_pence,
            standard_price_pence=item.price_band.price_pence if item.price_band else None,
            venue_fee_pence=item.venue_fee_pence,
            created_at=item.created_at,
        )


class OrderRead(BaseModel):
    id: uuid.UUID
    event_id: uuid.UUID
    order_number: str
    booker_name: str
    booker_email: str
    booker_phone: Optional[str] = None
    status: OrderStatus
    total_pence: int
    currency: str
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    expires_at: datetime
    view_token: uuid.UUID
    payment_method: Optional[str] = None
    order_items: List[OrderItemRead] = []

    model_config = {"from_attributes": True}


class OrderReadAdmin(OrderRead):
    payments: List[PaymentRead] = []
    amount_paid_pence: int = 0
    balance_pence: int = 0


class OrderReadAdminPaginated(BaseModel):
    items: List[OrderReadAdmin] = []
    total: int = 0
    page: int = 1
    page_size: int = 10
    total_pages: int = 0


class OrderItemPriceUpdate(BaseModel):
    price_pence: int = PydanticField(ge=0)


class OrderItemRequirementsUpdate(BaseModel):
    dietary_requirements: Optional[str] = None
    access_requirements: Optional[str] = None

    @model_validator(mode="after")
    def normalise_requirements(self):
        self.dietary_requirements = _normalise_optional_text(self.dietary_requirements)
        self.access_requirements = _normalise_optional_text(self.access_requirements)
        return self


class EventAttendeeReportAttendee(BaseModel):
    order_id: uuid.UUID
    order_number: str
    order_status: OrderStatus
    booker_name: str
    booker_email: str
    attendee_name: str
    attendee_dob: date
    attendee_age: int
    ticket_type_id: uuid.UUID
    ticket_type_name: Optional[str] = None
    price_band_label: Optional[str] = None
    price_band_qualifier: Optional[str] = None
    price_pence: int = 0
    venue_fee_pence: int = 0


class EventAttendeeReportAgeTab(BaseModel):
    label: str
    min_age: int
    max_age: int

    @model_validator(mode="after")
    def normalise_bounds(self):
        if self.min_age > self.max_age:
            self.min_age, self.max_age = self.max_age, self.min_age
        if self.min_age < 0:
            self.min_age = 0
        if self.max_age < 0:
            self.max_age = 0
        if not self.label.strip():
            self.label = "Untitled"
        return self


class EventAttendeeReportSettingsUpdate(BaseModel):
    age_tabs: List[EventAttendeeReportAgeTab] = []


class EventAttendeeReportSettings(BaseModel):
    event_id: uuid.UUID
    age_tabs: List[EventAttendeeReportAgeTab] = []


class EventAttendeeReport(BaseModel):
    event_id: uuid.UUID
    event_title: str
    event_starts_at: datetime
    age_tabs: List[EventAttendeeReportAgeTab] = []
    attendees: List[EventAttendeeReportAttendee] = []


class BookingViewEvent(BaseModel):
    title: str
    location: str
    starts_at: datetime


class BookingView(BaseModel):
    order_number: str
    booker_name: str
    status: OrderStatus
    total_pence: int
    currency: str
    confirmed_at: Optional[datetime] = None
    event: BookingViewEvent
    order_items: List[OrderItemRead] = []
    payments: List[PaymentRead] = []
    amount_paid_pence: int = 0
    balance_pence: int = 0
