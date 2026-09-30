"""
Events Router for AeroAqua API
Provides list of local events with status filtering and Authority Event Management (Add, Edit, Cancel).
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Event, AirQuality
from ..schemas import EventItem

router = APIRouter(prefix="/api/events", tags=["Events"])


class EventCreateUpdate(BaseModel):
    event_name: str
    event_type: str = Field(..., description="sports, concert, festival, gathering, construction, road_closure")
    region: Optional[str] = "Delhi"
    latitude: float
    longitude: float
    start_time: str
    end_time: str
    expected_crowd: int = 0
    affected_radius_km: float = 2.0
    description: Optional[str] = None


@router.get("", response_model=List[EventItem])
def get_events(
    status: str = Query("all", description="Filter by: all, active, upcoming, ended"),
    region: Optional[str] = Query(None, description="Filter by region"),
    db: Session = Depends(get_db)
):
    """Retrieve events, filterable by status (all, active, upcoming, ended) and region."""
    now = datetime.utcnow()

    query = db.query(Event)
    if region and region.lower() != "all":
        query = query.filter(Event.region.ilike(region.strip()))

    events = query.order_by(Event.start_time).all()
    items = []

    for ev in events:
        if ev.start_time <= now <= ev.end_time:
            ev_status = "ACTIVE"
        elif now < ev.start_time:
            ev_status = "UPCOMING"
        else:
            ev_status = "ENDED"

        if status.lower() != "all" and ev_status.lower() != status.lower():
            continue

        items.append(EventItem(
            id=ev.id,
            event_name=ev.event_name,
            event_type=ev.event_type,
            region=ev.region or "Delhi",
            latitude=ev.latitude,
            longitude=ev.longitude,
            start_time=ev.start_time.isoformat(),
            end_time=ev.end_time.isoformat(),
            expected_crowd=ev.expected_crowd,
            affected_radius_km=ev.affected_radius_km,
            description=ev.description,
            status=ev_status,
        ))

    return items


@router.post("", response_model=EventItem)
def create_event(payload: EventCreateUpdate, db: Session = Depends(get_db)):
    """Authority action: Add a new local event with start and end datetime validation."""
    try:
        st_time = datetime.fromisoformat(payload.start_time)
        end_time = datetime.fromisoformat(payload.end_time)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid ISO datetime: {e}")

    if end_time < st_time:
        raise HTTPException(status_code=400, detail="End date/time cannot be before start date/time.")

    new_event = Event(
        event_name=payload.event_name,
        event_type=payload.event_type,
        region=payload.region or "Delhi",
        latitude=payload.latitude,
        longitude=payload.longitude,
        start_time=st_time,
        end_time=end_time,
        expected_crowd=payload.expected_crowd,
        affected_radius_km=payload.affected_radius_km,
        description=payload.description,
    )
    db.add(new_event)
    db.commit()
    db.refresh(new_event)

    now = datetime.utcnow()
    status = "ACTIVE" if new_event.start_time <= now <= new_event.end_time else ("UPCOMING" if now < new_event.start_time else "ENDED")

    return EventItem(
        id=new_event.id,
        event_name=new_event.event_name,
        event_type=new_event.event_type,
        region=new_event.region or "Delhi",
        latitude=new_event.latitude,
        longitude=new_event.longitude,
        start_time=new_event.start_time.isoformat(),
        end_time=new_event.end_time.isoformat(),
        expected_crowd=new_event.expected_crowd,
        affected_radius_km=new_event.affected_radius_km,
        description=new_event.description,
        status=status,
    )


@router.put("/{event_id}", response_model=EventItem)
def update_event(event_id: int, payload: EventCreateUpdate, db: Session = Depends(get_db)):
    """Authority action: Edit an existing event with validation."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    try:
        st_time = datetime.fromisoformat(payload.start_time)
        end_time = datetime.fromisoformat(payload.end_time)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid ISO datetime: {e}")

    if end_time < st_time:
        raise HTTPException(status_code=400, detail="End date/time cannot be before start date/time.")

    event.start_time = st_time
    event.end_time = end_time
    event.event_name = payload.event_name
    event.event_type = payload.event_type
    if payload.region:
        event.region = payload.region
    event.latitude = payload.latitude
    event.longitude = payload.longitude
    event.expected_crowd = payload.expected_crowd
    event.affected_radius_km = payload.affected_radius_km
    if payload.description is not None:
        event.description = payload.description

    db.commit()
    db.refresh(event)

    now = datetime.utcnow()
    status = "ACTIVE" if event.start_time <= now <= event.end_time else ("UPCOMING" if now < event.start_time else "ENDED")

    return EventItem(
        id=event.id,
        event_name=event.event_name,
        event_type=event.event_type,
        region=event.region or "Delhi",
        latitude=event.latitude,
        longitude=event.longitude,
        start_time=event.start_time.isoformat(),
        end_time=event.end_time.isoformat(),
        expected_crowd=event.expected_crowd,
        affected_radius_km=event.affected_radius_km,
        description=event.description,
        status=status,
    )


@router.delete("/{event_id}")
def cancel_event(event_id: int, db: Session = Depends(get_db)):
    """Authority action: Cancel an event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(event)
    db.commit()
    return {"status": "ok", "message": f"Event '{event.event_name}' canceled successfully."}
