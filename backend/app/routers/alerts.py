"""
Alerts Router for AeroAqua API
Provides early-warning alerts endpoints and the Authority Broadcast System.
All actions protected by authority authorization and timestamps serialized in Asia/Kolkata (IST).
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Alert, Station
from ..services.auth_service import require_authority, AuthenticatedUser
from ..services.datetime_service import format_ist_iso, get_now_ist

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


class AlertResponseItem(BaseModel):
    id: int
    station_id: Optional[int] = None
    station_name: str
    created_at: str
    domain: str
    region: str
    risk_level: str
    title: str
    message: str
    current_pm25: Optional[float] = None
    forecast_pm25_6h: Optional[float] = None
    status: str
    is_broadcast: bool
    broadcast_at: Optional[str] = None
    is_active: bool


@router.get("", response_model=List[AlertResponseItem])
def get_alerts(
    active: bool = Query(True, description="Filter for currently active alerts"),
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, BROADCASTED, BROADCAST_STOPPED, RESOLVED"),
    region: Optional[str] = Query(None, description="Filter by region"),
    db: Session = Depends(get_db)
):
    """Retrieve early-warning alerts for authority review or history."""
    query = db.query(Alert, Station.name.label("station_name")).outerjoin(
        Station, Alert.station_id == Station.id
    )

    if status:
        query = query.filter(Alert.status == status.upper())
    elif active:
        # Exclude RESOLVED when active=True
        query = query.filter(Alert.is_active.is_(True), Alert.status != "RESOLVED")

    if region and region.lower() != "all":
        query = query.filter(Alert.region.ilike(f"%{region.strip()}%"))

    results = query.order_by(desc(Alert.created_at)).all()

    items = []
    for alert, s_name in results:
        items.append(AlertResponseItem(
            id=alert.id,
            station_id=alert.station_id,
            station_name=s_name or f"{alert.region} Regional Sensor",
            created_at=format_ist_iso(alert.created_at),
            domain=alert.domain or "air",
            region=alert.region or "Delhi",
            risk_level=alert.risk_level,
            title=alert.title,
            message=alert.message,
            current_pm25=round(float(alert.current_pm25), 1) if alert.current_pm25 is not None else None,
            forecast_pm25_6h=round(float(alert.forecast_pm25_6h), 1) if alert.forecast_pm25_6h is not None else None,
            status=alert.status or ("ACTIVE" if alert.is_active else "RESOLVED"),
            is_broadcast=bool(alert.is_broadcast),
            broadcast_at=format_ist_iso(alert.broadcast_at) if alert.broadcast_at else None,
            is_active=alert.is_active,
        ))

    return items


@router.get("/broadcasts", response_model=List[AlertResponseItem])
def get_active_broadcasts(
    region: Optional[str] = Query(None, description="Citizen region"),
    db: Session = Depends(get_db)
):
    """Retrieve active broadcasts visible to citizens in their region."""
    query = (
        db.query(Alert, Station.name.label("station_name"))
        .outerjoin(Station, Alert.station_id == Station.id)
        .filter(Alert.is_broadcast.is_(True), Alert.is_active.is_(True))
    )

    if region and region.lower() != "all":
        query = query.filter(Alert.region.ilike(f"%{region.strip()}%"))

    results = query.order_by(desc(Alert.broadcast_at), desc(Alert.created_at)).all()

    items = []
    for alert, s_name in results:
        items.append(AlertResponseItem(
            id=alert.id,
            station_id=alert.station_id,
            station_name=s_name or f"{alert.region} Sensor",
            created_at=format_ist_iso(alert.created_at),
            domain=alert.domain or "air",
            region=alert.region or "Delhi",
            risk_level=alert.risk_level,
            title=alert.title,
            message=alert.message,
            current_pm25=round(float(alert.current_pm25), 1) if alert.current_pm25 is not None else None,
            forecast_pm25_6h=round(float(alert.forecast_pm25_6h), 1) if alert.forecast_pm25_6h is not None else None,
            status=alert.status,
            is_broadcast=True,
            broadcast_at=format_ist_iso(alert.broadcast_at) if alert.broadcast_at else None,
            is_active=alert.is_active,
        ))
    return items


@router.post("/{alert_id}/broadcast")
def broadcast_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """
    Authority action: Broadcast alert to citizen dashboard.
    Rejects unauthorized citizen requests.
    Resolved alerts cannot be broadcast.
    """
    require_authority(authorization=authorization, x_user_role=x_user_role, db=db)

    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if alert.status == "RESOLVED" or not alert.is_active:
        raise HTTPException(
            status_code=400,
            detail="Resolved alerts cannot be broadcast. Create or activate a new alert if a new public warning is required."
        )

    if alert.status == "BROADCASTED" and alert.is_broadcast:
        raise HTTPException(
            status_code=400,
            detail="Alert is already actively broadcasted."
        )

    now_ist = get_now_ist().replace(tzinfo=None)
    alert.is_broadcast = True
    alert.status = "BROADCASTED"
    alert.broadcast_at = now_ist
    db.commit()

    return {
        "status": "ok",
        "message": f"Alert #{alert_id} successfully broadcast to citizens in {alert.region} region.",
        "alert_id": alert_id,
        "broadcast_status": "BROADCASTED",
        "alert_status": "BROADCASTED",
    }


@router.post("/{alert_id}/stop-broadcast")
def stop_broadcast(
    alert_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """
    Authority action: Stop active broadcast (disappears from citizen dashboard, history preserved).
    Rejects unauthorized citizen requests.
    """
    require_authority(authorization=authorization, x_user_role=x_user_role, db=db)

    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if alert.status == "RESOLVED" or not alert.is_active:
        raise HTTPException(
            status_code=400,
            detail="Cannot stop broadcast on an alert that is already resolved."
        )

    alert.is_broadcast = False
    alert.status = "BROADCAST_STOPPED"
    db.commit()

    return {
        "status": "ok",
        "message": f"Broadcast for Alert #{alert_id} stopped. Record preserved in historical database.",
        "alert_id": alert_id,
        "broadcast_status": "BROADCAST_STOPPED",
        "alert_status": "BROADCAST_STOPPED",
    }


@router.post("/{alert_id}/resolve")
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """
    Authority action: Mark alert as resolved.
    Rejects unauthorized citizen requests.
    """
    require_authority(authorization=authorization, x_user_role=x_user_role, db=db)

    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    now_ist = get_now_ist().replace(tzinfo=None)
    alert.is_active = False
    alert.is_broadcast = False
    alert.status = "RESOLVED"
    alert.resolved_at = now_ist
    db.commit()

    return {
        "status": "ok",
        "message": f"Alert #{alert_id} resolved.",
        "alert_id": alert_id,
        "alert_status": "RESOLVED",
    }
