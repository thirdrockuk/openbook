from datetime import date
from typing import List, Optional
from app.models.price_band import PriceBand


def age_at_event(dob: date, event_start: date) -> int:
    """Calculate attendee age at event start date."""
    age = event_start.year - dob.year
    if (event_start.month, event_start.day) < (dob.month, dob.day):
        age -= 1
    return age


def resolve_price_band(
    dob: date, event_start: date, price_bands: List[PriceBand], is_student: bool = False
) -> Optional[PriceBand]:
    """Find the correct price band for an attendee based on DOB, event start date, and student status.

    When is_student=True, prefers a band with qualifier='student' for the matched age range.
    Falls back to the standard (unqualified) band if no student band exists.
    """
    age = age_at_event(dob, event_start)
    matching = [b for b in price_bands if b.age_min <= age <= b.age_max]
    if not matching:
        return None
    if is_student:
        student_band = next((b for b in matching if b.qualifier == "student"), None)
        if student_band:
            return student_band
    return next((b for b in matching if not b.qualifier), None) or matching[0]
