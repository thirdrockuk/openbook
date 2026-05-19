from typing import List

from app.models.order import Order
from app.models.payment import PaymentStatus
from app.schemas.order import EventAttendeeReportAgeTab, OrderReadAdmin, OrderItemRead
from app.schemas.payment import PaymentRead


def _parse_event_attendee_report_age_tabs(raw_tabs) -> List[EventAttendeeReportAgeTab]:
    if not isinstance(raw_tabs, list):
        return []

    parsed_tabs: List[EventAttendeeReportAgeTab] = []
    for raw_tab in raw_tabs:
        if not isinstance(raw_tab, dict):
            continue
        try:
            parsed_tabs.append(EventAttendeeReportAgeTab.model_validate(raw_tab))
        except Exception:
            continue
    return parsed_tabs


def _order_to_admin_read(order: Order) -> OrderReadAdmin:
    amount_paid = sum(
        p.amount_pence for p in order.payments if p.status == PaymentStatus.succeeded
    )
    return OrderReadAdmin(
        id=order.id,
        event_id=order.event_id,
        order_number=order.order_number,
        booker_name=order.booker_name,
        booker_email=order.booker_email,
        booker_phone=order.booker_phone,
        status=order.status,
        total_pence=order.total_pence,
        currency=order.currency,
        created_at=order.created_at,
        confirmed_at=order.confirmed_at,
        expires_at=order.expires_at,
        view_token=order.view_token,
        order_items=[OrderItemRead.from_item(i) for i in order.order_items],
        payments=[PaymentRead.model_validate(p) for p in order.payments],
        amount_paid_pence=amount_paid,
        balance_pence=order.total_pence - amount_paid,
    )
