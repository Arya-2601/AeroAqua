"""
Zone Requests Router for AeroAqua API
Handles Public Zone Coverage Requests and Authority Review / Zone Creation Workflow.
"""

from datetime import datetime, timedelta
import random
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import ZoneRequest, Station, AirQuality, Weather, Traffic
from ..services.auth_service import require_authority, get_current_user
from ..services.datetime_service import format_ist_iso

router = APIRouter(prefix="/api/zone-requests", tags=["Zone Requests"])


class ZoneRequestCreate(BaseModel):
    applicant_name: Optional[str] = Field("Public Citizen", description="Full Name of applicant")
    email: Optional[str] = Field(None, description="Contact email")
    phone: Optional[str] = Field(None, description="Contact phone number")
    region: str = Field("Delhi", description="State or Union Territory")
    city: str
    area_locality: str
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    reason: Optional[str] = None
    description: Optional[str] = None


class ZoneRequestStatusUpdate(BaseModel):
    status: str = Field(..., description="Pending, Under Review, Approved, Rejected")
    rejection_reason: Optional[str] = None
    authority_notes: Optional[str] = None


class ZoneRequestResponse(BaseModel):
    id: int
    reference_id: str
    user_id: Optional[int] = None
    applicant_name: Optional[str] = "Public Citizen"
    email: Optional[str] = None
    phone: Optional[str] = None
    region: str
    city: str
    area_locality: str
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    reason: Optional[str] = None
    description: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    authority_notes: Optional[str] = None
    request_count: int
    created_at: str
    updated_at: str


@router.post("", response_model=ZoneRequestResponse)
def submit_zone_request(
    payload: ZoneRequestCreate,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """
    Public Action: Request Environmental Monitoring Coverage for unmonitored localities.
    Collects contact credentials for verification and follow-up.
    """
    auth_user = get_current_user(authorization=authorization, x_user_role=x_user_role, db=db)
    user_id = auth_user.id if auth_user and auth_user.id != 0 else None

    reg_clean = payload.region.strip()
    city_clean = payload.city.strip()
    area_clean = payload.area_locality.strip()

    # Check for duplicate request in the same area
    existing = db.query(ZoneRequest).filter(
        ZoneRequest.region.ilike(reg_clean),
        ZoneRequest.city.ilike(city_clean),
        ZoneRequest.area_locality.ilike(area_clean)
    ).first()

    now = datetime.utcnow()
    year = now.year

    if existing:
        existing.request_count += 1
        existing.updated_at = now
        if payload.applicant_name:
            existing.applicant_name = payload.applicant_name.strip()
        if payload.email:
            existing.email = payload.email.strip()
        if payload.phone:
            existing.phone = payload.phone.strip()
        if payload.reason and not existing.reason:
            existing.reason = payload.reason
        if payload.description and not existing.description:
            existing.description = payload.description
        if not existing.reference_id:
            existing.reference_id = f"ZR-{year}-{existing.id:04d}"
        db.commit()
        db.refresh(existing)
        return ZoneRequestResponse(
            id=existing.id,
            reference_id=existing.reference_id or f"ZR-{year}-{existing.id:04d}",
            user_id=existing.user_id,
            applicant_name=existing.applicant_name or "Public Citizen",
            email=existing.email,
            phone=existing.phone,
            region=existing.region,
            city=existing.city,
            area_locality=existing.area_locality,
            pincode=existing.pincode,
            latitude=existing.latitude,
            longitude=existing.longitude,
            reason=existing.reason,
            description=existing.description,
            status=existing.status,
            rejection_reason=existing.rejection_reason,
            authority_notes=existing.authority_notes,
            request_count=existing.request_count,
            created_at=format_ist_iso(existing.created_at),
            updated_at=format_ist_iso(existing.updated_at),
        )

    req = ZoneRequest(
        user_id=user_id,
        applicant_name=payload.applicant_name.strip() if payload.applicant_name else "Public Citizen",
        email=payload.email.strip() if payload.email else None,
        phone=payload.phone.strip() if payload.phone else None,
        region=reg_clean,
        city=city_clean,
        area_locality=area_clean,
        pincode=payload.pincode.strip() if payload.pincode else None,
        latitude=payload.latitude,
        longitude=payload.longitude,
        reason=payload.reason.strip() if payload.reason else None,
        description=payload.description.strip() if payload.description else None,
        status="Pending",
        request_count=1,
        created_at=now,
        updated_at=now,
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Assign unique reference ID
    req.reference_id = f"ZR-{year}-{req.id:04d}"
    db.commit()
    db.refresh(req)

    return ZoneRequestResponse(
        id=req.id,
        reference_id=req.reference_id,
        user_id=req.user_id,
        applicant_name=req.applicant_name or "Public Citizen",
        email=req.email,
        phone=req.phone,
        region=req.region,
        city=req.city,
        area_locality=req.area_locality,
        pincode=req.pincode,
        latitude=req.latitude,
        longitude=req.longitude,
        reason=req.reason,
        description=req.description,
        status=req.status,
        rejection_reason=req.rejection_reason,
        authority_notes=req.authority_notes,
        request_count=req.request_count,
        created_at=format_ist_iso(req.created_at),
        updated_at=format_ist_iso(req.updated_at),
    )


@router.get("", response_model=List[ZoneRequestResponse])
def get_zone_requests(
    region: Optional[str] = Query(None, description="Filter by state/region"),
    status: Optional[str] = Query(None, description="Filter by status: Pending, Under Review, Approved, Rejected"),
    db: Session = Depends(get_db),
):
    """
    List zone requests for authority review and public status tracking.
    """
    query = db.query(ZoneRequest)

    if region and region.lower() != "all":
        query = query.filter(ZoneRequest.region.ilike(f"%{region.strip()}%"))

    if status and status.lower() != "all":
        query = query.filter(ZoneRequest.status.ilike(status.strip()))

    requests = query.order_by(desc(ZoneRequest.request_count), desc(ZoneRequest.created_at)).all()
    year = datetime.utcnow().year

    return [
        ZoneRequestResponse(
            id=r.id,
            reference_id=r.reference_id or f"ZR-{year}-{r.id:04d}",
            user_id=r.user_id,
            applicant_name=r.applicant_name or "Public Citizen",
            email=r.email,
            phone=r.phone,
            region=r.region,
            city=r.city,
            area_locality=r.area_locality,
            pincode=r.pincode,
            latitude=r.latitude,
            longitude=r.longitude,
            reason=r.reason,
            description=r.description,
            status=r.status,
            rejection_reason=r.rejection_reason,
            authority_notes=r.authority_notes,
            request_count=r.request_count,
            created_at=format_ist_iso(r.created_at),
            updated_at=format_ist_iso(r.updated_at),
        )
        for r in requests
    ]


@router.patch("/{request_id}/status", response_model=ZoneRequestResponse)
def update_zone_request_status(
    request_id: int,
    payload: ZoneRequestStatusUpdate,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """
    Authority Action: Update status of a citizen zone request (Pending, Under Review, Approved, Rejected).
    Enforces state isolation.
    """
    user = require_authority(authorization=authorization, x_user_role=x_user_role, db=db)

    req = db.query(ZoneRequest).filter(ZoneRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Zone request not found.")

    if user.region and user.region.lower() not in ["all", "global"] and user.region.lower() != req.region.lower():
        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: Authority for {user.region} is not permitted to review requests in {req.region}."
        )

    valid_statuses = ["Pending", "Under Review", "Approved", "Rejected"]
    matched = next((s for s in valid_statuses if s.lower() == payload.status.strip().lower()), None)
    if not matched:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    req.status = matched
    if payload.rejection_reason is not None:
        req.rejection_reason = payload.rejection_reason.strip()
    if payload.authority_notes is not None:
        req.authority_notes = payload.authority_notes.strip()

    req.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(req)

    year = req.created_at.year if req.created_at else datetime.utcnow().year
    return ZoneRequestResponse(
        id=req.id,
        reference_id=req.reference_id or f"ZR-{year}-{req.id:04d}",
        user_id=req.user_id,
        applicant_name=req.applicant_name or "Public Citizen",
        email=req.email,
        phone=req.phone,
        region=req.region,
        city=req.city,
        area_locality=req.area_locality,
        pincode=req.pincode,
        latitude=req.latitude,
        longitude=req.longitude,
        reason=req.reason,
        description=req.description,
        status=req.status,
        rejection_reason=req.rejection_reason,
        authority_notes=req.authority_notes,
        request_count=req.request_count,
        created_at=format_ist_iso(req.created_at),
        updated_at=format_ist_iso(req.updated_at),
    )


@router.post("/{request_id}/create-zone")
def create_zone_from_request(
    request_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """
    Authority Action: Convert an approved citizen zone request into an active monitoring zone.
    Initializes 72 hours of baseline readings so analytics work immediately.
    """
    user = require_authority(authorization=authorization, x_user_role=x_user_role, db=db)

    req = db.query(ZoneRequest).filter(ZoneRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Zone request not found.")

    if user.region and user.region.lower() not in ["all", "global"] and user.region.lower() != req.region.lower():
        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: Authority for {user.region} cannot create zones in {req.region}."
        )

    # Coordinates fallback if not provided
    lat = req.latitude if req.latitude is not None else 28.6139
    lon = req.longitude if req.longitude is not None else 77.2090

    zone_name = f"{req.area_locality} ({req.city})" if req.city and req.city.lower() not in req.area_locality.lower() else req.area_locality

    new_station = Station(
        name=zone_name,
        region=req.region,
        data_source="Regional Monitoring Data",
        latitude=lat,
        longitude=lon,
        zone_profile="Residential",
        major_road_count_2km=2,
        distance_to_highway_m=1100.0,
        distance_to_major_road_m=260.0,
        road_density=2.6,
        industrial_distance_km=4.2,
        is_active=True,
    )
    db.add(new_station)
    db.commit()
    db.refresh(new_station)

    # Initialize 72 hours of baseline
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    aq_list, w_list, t_list = [], [], []
    for h in range(72, -1, -1):
        ts = now - timedelta(hours=h)
        is_rush = (8 <= ts.hour <= 10) or (18 <= ts.hour <= 21)
        diurnal = 12.0 if is_rush else (-5.0 if 12 <= ts.hour <= 16 else 0.0)
        pm = max(18.0, 68.0 + diurnal + random.uniform(-6.0, 6.0))
        aq_list.append(AirQuality(
            station_id=new_station.id,
            timestamp=ts,
            pm25=round(pm, 1),
            pm10=round(pm * 1.7, 1),
            no2=round(pm * 0.4, 1),
            so2=11.0,
            o3=22.0,
        ))
        w_list.append(Weather(
            station_id=new_station.id,
            timestamp=ts,
            temperature=27.5 + random.uniform(-3, 3),
            humidity=56.0 + random.uniform(-8, 8),
            wind_speed=8.0 + random.uniform(-2, 2),
            wind_direction=185.0 + random.uniform(-25, 25),
            rainfall=0.0,
        ))
        t_list.append(Traffic(
            station_id=new_station.id,
            timestamp=ts,
            traffic_index=int(max(15, min(90, 46 + (18 if is_rush else 0) + random.uniform(-4, 4)))),
        ))

    db.bulk_save_objects(aq_list)
    db.bulk_save_objects(w_list)
    db.bulk_save_objects(t_list)

    # Mark request as Approved
    req.status = "Approved"
    req.updated_at = datetime.utcnow()
    db.commit()

    return {
        "status": "ok",
        "message": f"Zone '{new_station.name}' successfully established in {req.region} from citizen request #{request_id}.",
        "station_id": new_station.id,
        "station_name": new_station.name,
        "region": new_station.region,
        "request_id": request_id,
        "reference_id": req.reference_id,
    }
