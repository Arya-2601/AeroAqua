"""
Events Router for AeroAqua API
Provides list of local events with automatic lifecycle status derivation
and Authority Event Management (Add, Edit, Cancel) protected with role authorization.
All datetimes standardized to Asia/Kolkata (IST).
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Event
from ..schemas import EventItem
from ..services.datetime_service import (
    parse_to_ist, format_ist_iso, compute_event_lifecycle, get_now_ist, IST_TZ
)
from ..services.auth_service import require_authority, AuthenticatedUser

router = APIRouter(prefix="/api/events", tags=["Events"])


class EventCreateUpdate(BaseModel):
    event_name: str
    event_type: str = Field(..., description="sports, concert, festival, gathering, construction, road_closure")
    region: Optional[str] = "Delhi"
    zone_name: Optional[str] = None
    latitude: float
    longitude: float
    start_time: str
    end_time: str
    expected_crowd: int = 0
    affected_radius_km: float = 2.0
    description: Optional[str] = None


@router.get("", response_model=List[EventItem])
def get_events(
    status: str = Query("all", description="Filter by: all, active, upcoming, ended, cancelled"),
    region: Optional[str] = Query(None, description="Filter by region (Delhi, Maharashtra, Gujarat)"),
    db: Session = Depends(get_db)
):
    """
    Retrieve events with automatic lifecycle status derivation based on current Asia/Kolkata time.
    Filtered by region and status.
    """
    now = get_now_ist()

    query = db.query(Event)
    if region and region.lower() != "all":
        query = query.filter(Event.region.ilike(region.strip()))

    events = query.order_by(Event.start_time).all()
    items = []

    for ev in events:
        # Dynamically compute lifecycle based on actual start/end timestamps and IST now
        is_cancelled = getattr(ev, "is_cancelled", False)
        ev_status = compute_event_lifecycle(ev.start_time, ev.end_time, is_cancelled=is_cancelled, reference_now=now)

        if status.lower() != "all" and ev_status.lower() != status.lower():
            continue

        items.append(EventItem(
            id=ev.id,
            event_name=ev.event_name,
            event_type=ev.event_type,
            region=ev.region or "Delhi",
            zone_name=getattr(ev, "zone_name", None),
            latitude=ev.latitude,
            longitude=ev.longitude,
            start_time=format_ist_iso(ev.start_time),
            end_time=format_ist_iso(ev.end_time),
            expected_crowd=ev.expected_crowd,
            affected_radius_km=ev.affected_radius_km,
            description=ev.description,
            status=ev_status,
        ))

    return items


@router.post("", response_model=EventItem)
def create_event(
    payload: EventCreateUpdate,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """
    Authority action: Add a new local event with start and end datetime validation.
    Interprets inputs as Asia/Kolkata (IST).
    Rejects unauthorized citizen requests.
    """
    # Verify authority privileges
    require_authority(authorization=authorization, x_user_role=x_user_role, db=db)

    try:
        st_ist = parse_to_ist(payload.start_time)
        et_ist = parse_to_ist(payload.end_time)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid ISO datetime: {e}")

    if et_ist < st_ist:
        raise HTTPException(status_code=400, detail="End date/time cannot be before start date/time.")

    # Convert to naive datetime for clean SQLite storage while preserving exact IST wall-clock representation
    st_naive = st_ist.replace(tzinfo=None)
    et_naive = et_ist.replace(tzinfo=None)

    new_event = Event(
        event_name=payload.event_name,
        event_type=payload.event_type,
        region=payload.region or "Delhi",
        zone_name=payload.zone_name,
        latitude=payload.latitude,
        longitude=payload.longitude,
        start_time=st_naive,
        end_time=et_naive,
        expected_crowd=payload.expected_crowd,
        affected_radius_km=payload.affected_radius_km,
        description=payload.description,
        is_cancelled=False,
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    status = compute_event_lifecycle(st_ist, et_ist, is_cancelled=False)

    return EventItem(
        id=new_event.id,
        event_name=new_event.event_name,
        event_type=new_event.event_type,
        region=new_event.region or "Delhi",
        zone_name=new_event.zone_name,
        latitude=new_event.latitude,
        longitude=new_event.longitude,
        start_time=format_ist_iso(new_event.start_time),
        end_time=format_ist_iso(new_event.end_time),
        expected_crowd=new_event.expected_crowd,
        affected_radius_km=new_event.affected_radius_km,
        description=new_event.description,
        status=status,
    )


@router.put("/{event_id}", response_model=EventItem)
def update_event(
    event_id: int,
    payload: EventCreateUpdate,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """
    Authority action: Edit an existing event with validation.
    Rejects unauthorized citizen requests.
    """
    require_authority(authorization=authorization, x_user_role=x_user_role, db=db)

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    try:
        st_ist = parse_to_ist(payload.start_time)
        et_ist = parse_to_ist(payload.end_time)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid ISO datetime: {e}")

    if et_ist < st_ist:
        raise HTTPException(status_code=400, detail="End date/time cannot be before start date/time.")

    event.start_time = st_ist.replace(tzinfo=None)
    event.end_time = et_ist.replace(tzinfo=None)
    event.event_name = payload.event_name
    event.event_type = payload.event_type
    if payload.region:
        event.region = payload.region
    if payload.zone_name is not None:
        event.zone_name = payload.zone_name
    event.latitude = payload.latitude
    event.longitude = payload.longitude
    event.expected_crowd = payload.expected_crowd
    event.affected_radius_km = payload.affected_radius_km
    if payload.description is not None:
        event.description = payload.description

    db.commit()
    db.refresh(event)

    is_cancelled = getattr(event, "is_cancelled", False)
    status = compute_event_lifecycle(event.start_time, event.end_time, is_cancelled=is_cancelled)

    return EventItem(
        id=event.id,
        event_name=event.event_name,
        event_type=event.event_type,
        region=event.region or "Delhi",
        zone_name=getattr(event, "zone_name", None),
        latitude=event.latitude,
        longitude=event.longitude,
        start_time=format_ist_iso(event.start_time),
        end_time=format_ist_iso(event.end_time),
        expected_crowd=event.expected_crowd,
        affected_radius_km=event.affected_radius_km,
        description=event.description,
        status=status,
    )


@router.delete("/{event_id}")
def cancel_event(
    event_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """
    Authority action: Cancel an event.
    Rejects unauthorized citizen requests.
    """
    require_authority(authorization=authorization, x_user_role=x_user_role, db=db)

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Mark as cancelled
    event.is_cancelled = True
    db.commit()

    return {"status": "ok", "message": f"Event '{event.event_name}' canceled successfully."}
