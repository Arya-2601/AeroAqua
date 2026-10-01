"""
Reports Router for AeroAqua API
Handles Public Environmental Issue Reporting and Authority Review Workflow.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import CitizenReport, User
from ..services.auth_service import require_authority, get_current_user
from ..services.datetime_service import format_ist_iso, get_now_ist

router = APIRouter(prefix="/api/reports", tags=["Citizen Reports"])


class ReportCreateRequest(BaseModel):
    reporter_name: Optional[str] = Field("Public Citizen", description="Full name of reporter")
    email: Optional[str] = Field(None, description="Contact email")
    phone: Optional[str] = Field(None, description="Contact phone number")
    category: str = Field(..., description="air_pollution, water_concern, industrial_activity, other")
    region: str = Field("Delhi", description="State or Union Territory")
    city: str
    area_locality: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: str = Field(..., min_length=5, max_length=1000)
    photo_url: Optional[str] = None


class ReportStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="Pending, Under Review, Resolved, Rejected")
    authority_notes: Optional[str] = None


class ReportResponseItem(BaseModel):
    id: int
    reference_id: str
    user_id: Optional[int] = None
    reporter_name: Optional[str] = "Public Citizen"
    email: Optional[str] = None
    phone: Optional[str] = None
    category: str
    region: str
    city: str
    area_locality: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: str
    photo_url: Optional[str] = None
    status: str
    authority_notes: Optional[str] = None
    created_at: str
    updated_at: str


@router.post("", response_model=ReportResponseItem)
def submit_report(
    payload: ReportCreateRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """
    Public Action: Submit an environmental issue report.
    Collects contact details so authority can verify and follow up on this submission.
    """
    auth_user = get_current_user(authorization=authorization, x_user_role=x_user_role, db=db)
    user_id = auth_user.id if auth_user and auth_user.id != 0 else None

    # Normalization of category
    cat_clean = payload.category.strip().lower().replace(" ", "_")

    now = datetime.utcnow()
    year = now.year

    report = CitizenReport(
        user_id=user_id,
        reporter_name=payload.reporter_name.strip() if payload.reporter_name else "Public Citizen",
        email=payload.email.strip() if payload.email else None,
        phone=payload.phone.strip() if payload.phone else None,
        category=cat_clean,
        region=payload.region.strip(),
        city=payload.city.strip(),
        area_locality=payload.area_locality.strip(),
        latitude=payload.latitude,
        longitude=payload.longitude,
        description=payload.description.strip(),
        photo_url=payload.photo_url.strip() if payload.photo_url else None,
        status="Pending",
        created_at=now,
        updated_at=now,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # Assign reference ID
    report.reference_id = f"REP-{year}-{report.id:04d}"
    db.commit()
    db.refresh(report)

    return ReportResponseItem(
        id=report.id,
        reference_id=report.reference_id,
        user_id=report.user_id,
        reporter_name=report.reporter_name or "Public Citizen",
        email=report.email,
        phone=report.phone,
        category=report.category,
        region=report.region,
        city=report.city,
        area_locality=report.area_locality,
        latitude=report.latitude,
        longitude=report.longitude,
        description=report.description,
        photo_url=report.photo_url,
        status=report.status,
        authority_notes=report.authority_notes,
        created_at=format_ist_iso(report.created_at),
        updated_at=format_ist_iso(report.updated_at),
    )


@router.get("", response_model=List[ReportResponseItem])
def get_reports(
    region: Optional[str] = Query(None, description="Filter by state/region"),
    status: Optional[str] = Query(None, description="Filter by status: Pending, Under Review, Resolved, Rejected"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
):
    """
    List citizen reports. Filterable by region, status, and category.
    """
    query = db.query(CitizenReport)

    if region and region.lower() != "all":
        query = query.filter(CitizenReport.region.ilike(f"%{region.strip()}%"))

    if status and status.lower() != "all":
        query = query.filter(CitizenReport.status.ilike(status.strip()))

    if category and category.lower() != "all":
        query = query.filter(CitizenReport.category.ilike(category.strip()))

    reports = query.order_by(desc(CitizenReport.created_at)).all()
    year = datetime.utcnow().year

    return [
        ReportResponseItem(
            id=r.id,
            reference_id=r.reference_id or f"REP-{year}-{r.id:04d}",
            user_id=r.user_id,
            reporter_name=r.reporter_name or "Public Citizen",
            email=r.email,
            phone=r.phone,
            category=r.category,
            region=r.region,
            city=r.city,
            area_locality=r.area_locality,
            latitude=r.latitude,
            longitude=r.longitude,
            description=r.description,
            photo_url=r.photo_url,
            status=r.status,
            authority_notes=r.authority_notes,
            created_at=format_ist_iso(r.created_at),
            updated_at=format_ist_iso(r.updated_at),
        )
        for r in reports
    ]


@router.patch("/{report_id}/status", response_model=ReportResponseItem)
def update_report_status(
    report_id: int,
    payload: ReportStatusUpdateRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """
    Authority Action: Review and update report status (Under Review, Resolved, Rejected) and provide response.
    Enforces state isolation: Authority cannot modify reports from another state.
    """
    user = require_authority(authorization=authorization, x_user_role=x_user_role, db=db)

    report = db.query(CitizenReport).filter(CitizenReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    if user.region and user.region.lower() not in ["all", "global"] and user.region.lower() != report.region.lower():
        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: Authority for {user.region} is not permitted to modify citizen reports in {report.region}."
        )

    valid_statuses = ["Pending", "Under Review", "Resolved", "Rejected"]
    matched_status = next((s for s in valid_statuses if s.lower() == payload.status.strip().lower()), None)
    if not matched_status:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    report.status = matched_status
    if payload.authority_notes is not None:
        report.authority_notes = payload.authority_notes.strip()
    report.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(report)

    year = report.created_at.year if report.created_at else datetime.utcnow().year
    return ReportResponseItem(
        id=report.id,
        reference_id=report.reference_id or f"REP-{year}-{report.id:04d}",
        user_id=report.user_id,
        reporter_name=report.reporter_name or "Public Citizen",
        email=report.email,
        phone=report.phone,
        category=report.category,
        region=report.region,
        city=report.city,
        area_locality=report.area_locality,
        latitude=report.latitude,
        longitude=report.longitude,
        description=report.description,
        photo_url=report.photo_url,
        status=report.status,
        authority_notes=report.authority_notes,
        created_at=format_ist_iso(report.created_at),
        updated_at=format_ist_iso(report.updated_at),
    )
