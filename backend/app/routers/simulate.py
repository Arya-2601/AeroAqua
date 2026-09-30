"""
Simulation Router for AeroAqua API
Provides controlled demonstration anomaly generation:
- POST /api/simulate/spike: "Run Demo Anomaly"
Clearly labeled as DEMO SIMULATION with consistent UTC timestamps.
Processed through the complete intelligence pipeline (Baseline -> Anomaly -> Context -> Forecast -> Risk -> Alert -> Authority Review).
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Station, AirQuality, Traffic, Alert
from ..services.anomaly import detect_station_latest_anomaly
from ..services.correlation import get_station_correlation_context
from ..services.forecasting import forecast_station_pm25
from ..services.alerts import evaluate_and_update_station_alert

router = APIRouter(prefix="/api/simulate", tags=["Simulation"])


class DemoAnomalyRequest(BaseModel):
    station_id: int = Field(..., ge=1, description="Station ID")
    magnitude_pct: float = Field(70.0, ge=20.0, le=250.0, description="Spike magnitude % above baseline")


class DemoAnomalyResponse(BaseModel):
    status: str
    message: str
    is_demo_simulation: bool = True
    station_id: int
    station_name: str
    updated_pm25: float
    timestamp_utc: str
    source_label: str = "Demo Simulation"
    anomaly: Dict[str, Any]
    forecast: Dict[str, Any]
    alert: Optional[Dict[str, Any]] = None


@router.post("/spike", response_model=DemoAnomalyResponse)
def run_demo_anomaly(payload: DemoAnomalyRequest, db: Session = Depends(get_db)):
    """
    Run Demo Anomaly (Simulation):
    Manually triggers a controlled spike to demonstrate the ML anomaly,
    contextual correlation, forecasting, and alert broadcasting pipeline.
    """
    station = db.query(Station).filter(Station.id == payload.station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    latest_aq = (
        db.query(AirQuality)
        .filter(AirQuality.station_id == payload.station_id)
        .order_by(desc(AirQuality.timestamp))
        .first()
    )
    if not latest_aq:
        raise HTTPException(status_code=400, detail="No readings found for station")

    # Use the latest reading's timestamp to maintain exact hour-aligned baseline
    target_ts = latest_aq.timestamp

    # Compute baseline for this hour
    initial_det = detect_station_latest_anomaly(db, payload.station_id, persist=False)
    base_mean = initial_det.get("baseline_mean", 80.0)
    if base_mean <= 0:
        base_mean = 80.0

    # Spiked reading calculation
    spiked_pm25 = round(base_mean * (1.0 + (payload.magnitude_pct / 100.0)), 1)

    # Update latest air quality record
    latest_aq.pm25 = spiked_pm25
    latest_aq.pm10 = round(spiked_pm25 * 1.8, 1)
    latest_aq.timestamp = target_ts

    # Simulate corresponding traffic spike if magnitude is high
    latest_traffic = (
        db.query(Traffic)
        .filter(Traffic.station_id == payload.station_id)
        .order_by(desc(Traffic.timestamp))
        .first()
    )
    if latest_traffic and payload.magnitude_pct >= 50:
        latest_traffic.traffic_index = min(92, latest_traffic.traffic_index + 20)
        latest_traffic.timestamp = target_ts

    db.commit()

    # 1. Anomaly Detection
    anomaly_res = detect_station_latest_anomaly(db, payload.station_id, persist=True)

    # 2. Context Correlation
    context_res = get_station_correlation_context(db, payload.station_id)

    # 3. XGBoost Forecasting
    forecast_res = forecast_station_pm25(db, payload.station_id)
    f_items = forecast_res.get("forecast", [])
    f1 = f_items[0]["pm25"] if len(f_items) > 0 else spiked_pm25
    f3 = f_items[1]["pm25"] if len(f_items) > 1 else spiked_pm25
    f6 = f_items[2]["pm25"] if len(f_items) > 2 else spiked_pm25

    # 4. Alert Generation
    new_alert = evaluate_and_update_station_alert(
        db=db,
        station_id=payload.station_id,
        current_pm25=spiked_pm25,
        deviation_pct=anomaly_res.get("deviation_pct", 0.0),
        is_anomaly=anomaly_res.get("is_anomaly", True),
        anomaly_severity=anomaly_res.get("severity", "high"),
        factors=context_res.get("factors", []),
        forecast_1h=f1,
        forecast_3h=f3,
        forecast_6h=f6,
    )

    alert_dict = None
    if new_alert:
        new_alert.status = "ACTIVE"
        new_alert.is_broadcast = False
        new_alert.region = station.region or "Delhi"
        new_alert.created_at = target_ts
        db.commit()
        alert_dict = {
            "id": new_alert.id,
            "risk_level": new_alert.risk_level,
            "title": new_alert.title,
            "message": new_alert.message,
            "status": new_alert.status,
            "is_broadcast": new_alert.is_broadcast,
        }

    return DemoAnomalyResponse(
        status="ok",
        message=f"[DEMO SIMULATION] Injected +{payload.magnitude_pct}% anomaly into {station.name}. Ready for authority review and broadcasting.",
        is_demo_simulation=True,
        station_id=payload.station_id,
        station_name=station.name,
        updated_pm25=spiked_pm25,
        timestamp_utc=target_ts.isoformat(),
        source_label="Demo Simulation",
        anomaly=anomaly_res,
        forecast=forecast_res,
        alert=alert_dict,
    )


@router.post("/reset")
def reset_simulation(db: Session = Depends(get_db)):
    """Reset simulation back to pristine demo dataset with clean baseline demo anomaly & alert state."""
    from scripts.seed_db import seed_database
    seed_database(reset=True)
    db.expire_all()

    # Re-initialize pristine baseline demo state
    from ..services.anomaly import detect_all_stations_anomalies
    from ..services.correlation import get_station_correlation_context
    from ..services.forecasting import forecast_station_pm25
    from ..services.alerts import evaluate_and_update_station_alert

    anoms = detect_all_stations_anomalies(db, persist=True)
    zone_b_anom = next((a for a in anoms if a["station_id"] == 2), None)
    if zone_b_anom and zone_b_anom["is_anomaly"]:
        ctx = get_station_correlation_context(db, 2)
        f_res = forecast_station_pm25(db, 2)
        f_items = f_res.get("forecast", [])
        f1 = f_items[0]["pm25"] if len(f_items) > 0 else zone_b_anom["pm25"]
        f3 = f_items[1]["pm25"] if len(f_items) > 1 else zone_b_anom["pm25"]
        f6 = f_items[2]["pm25"] if len(f_items) > 2 else zone_b_anom["pm25"]

        evaluate_and_update_station_alert(
            db=db,
            station_id=2,
            current_pm25=zone_b_anom["pm25"],
            deviation_pct=zone_b_anom["deviation_pct"],
            is_anomaly=True,
            anomaly_severity=zone_b_anom["severity"],
            factors=ctx.get("factors", []),
            forecast_1h=f1,
            forecast_3h=f3,
            forecast_6h=f6,
        )

    return {"status": "ok", "message": "Demo data reset successfully to pristine state."}
