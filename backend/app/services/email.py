import logging
from typing import TYPE_CHECKING

from app.config import settings

if TYPE_CHECKING:
    from sqlmodel import Session
    from app.models.order import Order

logger = logging.getLogger(__name__)


def _is_resend_configured() -> bool:
    """Check if Resend is properly configured."""
    key = settings.resend_api_key
    if not key or key.startswith("re_your_key"):
        return False
    return True


def send_booking_confirmation(order: "Order", session: "Session") -> None:
    """Send booking confirmation email via Resend."""
    if not _is_resend_configured():
        logger.warning(
            "RESEND_API_KEY not configured — skipping confirmation email for order %s",
            order.order_number,
        )
        return

    try:
        import resend

        resend.api_key = settings.resend_api_key

        event = order.event
        items_html = ""
        for item in order.order_items:
            price_display = f"£{item.price_pence / 100:.2f}"
            band_label = item.price_band.label if item.price_band else "Unknown"
            ticket_name = item.ticket_type.name if item.ticket_type else "Unknown"
            items_html += f"""
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{item.attendee_name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{ticket_name}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">{band_label}</td>
                <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">{price_display}</td>
            </tr>
            """

        total_display = f"£{order.total_pence / 100:.2f}"

        html_content = f"""
        <html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Booking Confirmed! 🎉</h1>
            <p>Hi {order.booker_name},</p>
            <p>Your booking has been confirmed. Here are your details:</p>

            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <strong>Order Number:</strong> {order.order_number}<br>
                <strong>Event:</strong> {event.title}<br>
                <strong>Date:</strong> {event.starts_at.strftime("%d %B %Y, %H:%M")}<br>
                <strong>Location:</strong> {event.location}
            </div>

            <p>
                <a href="{settings.app_url}/booking/{order.view_token}"
                   style="display: inline-block; background: #4f46e5; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                    View your booking
                </a>
            </p>
            <p style="color: #666; font-size: 13px;">
                You can use this link at any time to check your booking details, payments received, and any outstanding balance.
            </p>

            <h2>Attendees</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #333; color: white;">
                        <th style="padding: 8px; text-align: left;">Name</th>
                        <th style="padding: 8px; text-align: left;">Ticket Type</th>
                        <th style="padding: 8px; text-align: left;">Price Band</th>
                        <th style="padding: 8px; text-align: right;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" style="padding: 8px; font-weight: bold;">Total</td>
                        <td style="padding: 8px; font-weight: bold; text-align: right;">{total_display}</td>
                    </tr>
                </tfoot>
            </table>

            <p style="margin-top: 24px; color: #666; font-size: 14px;">
                If you have any questions, please contact us.<br>
                {settings.app_name}
            </p>
        </body>
        </html>
        """

        resend.Emails.send({
            "from": f"{settings.email_from_name} <{settings.email_from_address}>",
            "to": [order.booker_email],
            "subject": f"Booking Confirmed — {event.title} [{order.order_number}]",
            "html": html_content,
        })

        logger.info("Confirmation email sent for order %s", order.order_number)

    except Exception as e:
        logger.error("Failed to send email for order %s: %s", order.order_number, e)
        raise
