"""
Alerts Router for AeroAqua API
Provides early-warning alerts endpoints, explainable alert breakdown, action cards,
and the Authority Broadcast System.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Alert, Station, Anomaly
from ..services.auth_service import require_authority, AuthenticatedUser
from ..services.datetime_service import format_ist_iso, get_now_ist
from ..services.anomaly import detect_station_latest_anomaly
from ..services.correlation import get_station_correlation_context
from ..services.forecasting import forecast_station_pm25
from ..services.alerts import generate_recommendations

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


class ExplainableAlertDetails(BaseModel):
    current_pm25: float
    baseline_expected: Optional[float] = None
    deviation_pct: float
    anomaly_severity: str
    z_score: Optional[float] = None
    forecast_1h: Optional[float] = None
    forecast_3h: Optional[float] = None
    forecast_6h: Optional[float] = None
    factors: List[Dict[str, Any]] = []
    provenance: str = "LIVE"
    source_label: str = "OpenAQ & Regional Telemetry"
    what_you_should_know: str = "Pollution is currently unusually high compared with the zone's historical pattern."
    recommendations: List[str] = []


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
    provenance: str = "LIVE"
    deviation_pct: Optional[float] = None
    anomaly_severity: Optional[str] = None
    explanation: Optional[ExplainableAlertDetails] = None


def build_alert_explanation(db: Session, alert: Alert, s_name: Optional[str] = None) -> ExplainableAlertDetails:
    curr_pm = float(alert.current_pm25) if alert.current_pm25 is not None else 0.0
    dev_pct = float(alert.deviation_pct) if alert.deviation_pct is not None else 0.0
    anom_sev = alert.anomaly_severity or ("CRITICAL" if alert.risk_level == "CRITICAL" else ("HIGH" if alert.risk_level == "WARNING" else "MODERATE"))
    provenance = alert.provenance or "LIVE"
    source_label = "Authority What-If Scenario" if provenance == "SIMULATION" else "OpenAQ & Regional Telemetry"

    base_expected = None
    z_score = None
    factors = []
    f1, f3, f6 = None, None, alert.forecast_pm25_6h

    if alert.station_id:
        try:
            anom = detect_station_latest_anomaly(db, alert.station_id, persist=False)
            base_expected = anom.get("baseline_mean")
            z_score = anom.get("z_score")
            if not dev_pct:
                dev_pct = anom.get("deviation_pct", 0.0)
            if not anom_sev or anom_sev == "none":
                anom_sev = anom.get("severity", "moderate")
        except Exception:
            pass

        try:
            ctx = get_station_correlation_context(db, alert.station_id)
            factors = ctx.get("factors", [])
        except Exception:
            pass

        try:
            fc = forecast_station_pm25(db, alert.station_id)
            f_items = fc.get("forecast", [])
            if len(f_items) > 0:
                f1 = f_items[0].get("pm25")
            if len(f_items) > 1:
                f3 = f_items[1].get("pm25")
            if len(f_items) > 2:
                f6 = f_items[2].get("pm25")
        except Exception:
            pass

    recs = generate_recommendations(alert.risk_level)

    return ExplainableAlertDetails(
        current_pm25=round(curr_pm, 1),
        baseline_expected=round(base_expected, 1) if base_expected is not None else None,
        deviation_pct=round(dev_pct, 1),
        anomaly_severity=anom_sev.upper(),
        z_score=round(z_score, 2) if z_score is not None else None,
        forecast_1h=round(f1, 1) if f1 is not None else None,
        forecast_3h=round(f3, 1) if f3 is not None else None,
        forecast_6h=round(f6, 1) if f6 is not None else None,
        factors=factors,
        provenance=provenance,
        source_label=source_label,
        what_you_should_know="Pollution is currently unusually high compared with the zone's historical pattern.",
        recommendations=recs,
    )


@router.get("", response_model=List[AlertResponseItem])
def get_alerts(
    active: bool = Query(True, description="Filter for currently active alerts"),
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, BROADCASTED, BROADCAST_STOPPED, RESOLVED"),
    region: Optional[str] = Query(None, description="Filter by region"),
    db: Session = Depends(get_db)
):
    """Retrieve early-warning alerts with explainability breakdown."""
    query = db.query(Alert, Station.name.label("station_name")).outerjoin(
        Station, Alert.station_id == Station.id
    )

    if status:
        query = query.filter(Alert.status == status.upper())
    elif active:
        query = query.filter(Alert.is_active.is_(True), Alert.status != "RESOLVED")

    if region and region.lower() != "all":
        query = query.filter(Alert.region.ilike(f"%{region.strip()}%"))

    results = query.order_by(desc(Alert.created_at)).all()

    items = []
    for alert, s_name in results:
        expl = build_alert_explanation(db, alert, s_name)
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
            provenance=alert.provenance or "LIVE",
            deviation_pct=alert.deviation_pct,
            anomaly_severity=alert.anomaly_severity,
            explanation=expl,
        ))

    return items


@router.get("/broadcasts", response_model=List[AlertResponseItem])
def get_active_broadcasts(
    region: Optional[str] = Query(None, description="Citizen region"),
    db: Session = Depends(get_db)
):
    """Retrieve active broadcasts visible to citizens with explainability cards."""
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
        expl = build_alert_explanation(db, alert, s_name)
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
            provenance=alert.provenance or "LIVE",
            deviation_pct=alert.deviation_pct,
            anomaly_severity=alert.anomaly_severity,
            explanation=expl,
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
