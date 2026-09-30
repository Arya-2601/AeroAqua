"""
Events Router for AeroAqua API
Provides list of local events with status filtering.
"""

from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Event, AirQuality
from ..schemas import EventItem

router = APIRouter(prefix="/api/events", tags=["Events"])


@router.get("", response_model=List[EventItem])
def get_events(
    status: str = Query("all", description="Filter by: all, active, upcoming, ended"),
    db: Session = Depends(get_db)
):
    """Retrieve all events, filterable by status."""
    # Find current simulation time from latest air quality timestamp
    latest_aq = db.query(AirQuality).order_by(desc(AirQuality.timestamp)).first()
    curr_dt = latest_aq.timestamp if latest_aq else datetime.utcnow()

    events = db.query(Event).order_by(Event.start_time).all()
    items = []

    for ev in events:
        if ev.start_time <= curr_dt <= ev.end_time:
            ev_status = "active"
        elif curr_dt < ev.start_time:
            ev_status = "upcoming"
        else:
            ev_status = "ended"

        if status.lower() != "all" and ev_status != status.lower():
            continue

        items.append(EventItem(
            id=ev.id,
            event_name=ev.event_name,
            event_type=ev.event_type,
            latitude=ev.latitude,
            longitude=ev.longitude,
            start_time=ev.start_time.isoformat(),
            end_time=ev.end_time.isoformat(),
            expected_crowd=ev.expected_crowd,
            affected_radius_km=ev.affected_radius_km,
            status=ev_status,
        ))

    return items
