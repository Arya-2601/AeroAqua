"""
Timezone and Datetime Utilities for AeroAqua
Standardized to Asia/Kolkata (IST: UTC+05:30).
Ensures consistent, unambiguous datetime serialization, parsing, and lifecycle determination.
"""

from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Optional

IST_TZ = ZoneInfo("Asia/Kolkata")


def get_now_ist() -> datetime:
    """Return the current datetime localized to Asia/Kolkata (IST)."""
    return datetime.now(IST_TZ)


def parse_to_ist(dt_str: str) -> datetime:
    """
    Parse an incoming ISO 8601 string or date/time string into a timezone-aware datetime in Asia/Kolkata.
    Handles:
    - Offset ISO: '2026-10-01T01:27:00+05:30' -> preserved in IST
    - UTC ISO with Z: '2026-09-30T19:57:00Z' -> converted to 2026-10-01T01:27:00 IST
    - Naive ISO: '2026-10-01T01:27:00' -> interpreted as Asia/Kolkata IST
    - Space separated: '2026-10-01 01:27:00' -> interpreted as Asia/Kolkata IST
    """
    if not dt_str:
        return get_now_ist()

    clean_str = dt_str.strip()
    if " " in clean_str and "T" not in clean_str:
        clean_str = clean_str.replace(" ", "T")

    # In Python 3.11+, fromisoformat handles 'Z' and arbitrary offsets
    if clean_str.endswith("Z"):
        clean_str = clean_str[:-1] + "+00:00"

    dt = datetime.fromisoformat(clean_str)

    if dt.tzinfo is None:
        # All user-entered datetimes in AeroAqua are intended as IST
        return dt.replace(tzinfo=IST_TZ)
    else:
        # Convert any foreign timezone/UTC to IST
        return dt.astimezone(IST_TZ)


def format_ist_iso(dt: Optional[datetime]) -> Optional[str]:
    """
    Format a datetime object into a timezone-aware ISO 8601 string with +05:30 offset.
    Guarantees no ambiguous UTC / local shifts on client side.
    """
    if dt is None:
        return None

    if dt.tzinfo is None:
        localized = dt.replace(tzinfo=IST_TZ)
    else:
        localized = dt.astimezone(IST_TZ)

    return localized.isoformat()


def compute_event_lifecycle(
    start_dt: datetime,
    end_dt: datetime,
    is_cancelled: bool = False,
    reference_now: Optional[datetime] = None
) -> str:
    """
    Derive the event lifecycle status automatically based on current IST time:
    - is_cancelled == True -> CANCELLED
    - now < start_time -> UPCOMING
    - start_time <= now <= end_time -> ACTIVE
    - now > end_time -> ENDED
    """
    if is_cancelled:
        return "CANCELLED"

    now = reference_now if reference_now is not None else get_now_ist()
    if now.tzinfo is None:
        now = now.replace(tzinfo=IST_TZ)
    else:
        now = now.astimezone(IST_TZ)

    st = start_dt.replace(tzinfo=IST_TZ) if start_dt.tzinfo is None else start_dt.astimezone(IST_TZ)
    et = end_dt.replace(tzinfo=IST_TZ) if end_dt.tzinfo is None else end_dt.astimezone(IST_TZ)

    if now < st:
        return "UPCOMING"
    elif st <= now <= et:
        return "ACTIVE"
    else:
        return "ENDED"
