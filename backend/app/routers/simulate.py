"""
Simulation Router for AeroAqua API
Provides controlled Authority What-If Scenarios:
- POST /api/simulate/spike: "Run What-If Scenario"
Clearly labeled as SIMULATION data with source provenance and recommended operational responses.
Processed through the complete intelligence pipeline (Baseline -> Anomaly -> Context -> Forecast -> Risk -> Alert -> Authority Review -> Citizen Broadcast).
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Station, AirQuality, Traffic, Alert
from ..services.anomaly import detect_station_latest_anomaly
from ..services.correlation import get_station_correlation_context
from ..services.forecasting import forecast_station_pm25
from ..services.alerts import evaluate_and_update_station_alert
from ..services.auth_service import require_authority
from ..services.datetime_service import format_ist_iso

router = APIRouter(prefix="/api/simulate", tags=["Simulation"])


class WhatIfScenarioRequest(BaseModel):
    station_id: int = Field(..., ge=1, description="Station ID")
    magnitude_pct: float = Field(75.0, ge=10.0, le=300.0, description="Spike magnitude % above baseline")
    scenario_type: Optional[str] = Field("PM2.5 Surge", description="Scenario type e.g. PM2.5 Surge, Industrial Inversion, Wildfire Incursion")


class WhatIfScenarioResponse(BaseModel):
    status: str
    message: str
    is_simulation: bool = True
    is_demo_simulation: bool = True
    provenance: str = "SIMULATION"
    source_label: str = "Authority What-If Scenario"
    scenario_type: str = "PM2.5 Surge"
    station_id: int
    station_name: str
    region: str
    current_pm25: float
    simulated_pm25: float
    timestamp_utc: str
    anomaly: Dict[str, Any]
    context: Dict[str, Any]
    forecast: Dict[str, Any]
    alert: Optional[Dict[str, Any]] = None
    recommended_response: List[str] = []


@router.post("/spike", response_model=WhatIfScenarioResponse)
def run_what_if_scenario(
    payload: WhatIfScenarioRequest,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """
    Run What-If Scenario (Controlled Simulation):
    Simulates a localized environmental surge and triggers the ML pipeline:
    Baseline comparison -> Anomaly scoring -> Context correlation -> XGBoost forecasting -> Risk evaluation -> Alert generation.
    Authority only. Citizen requests rejected with 403 Forbidden.
    """
    user = require_authority(authorization=authorization, x_user_role=x_user_role, db=db)
    station = db.query(Station).filter(Station.id == payload.station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    # State isolation check
    if user.region and user.region.lower() not in ["all", "global"] and user.region.lower() != station.region.lower():
        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: Authority for {user.region} cannot run simulation scenarios on {station.region} stations."
        )

    latest_aq = (
        db.query(AirQuality)
        .filter(AirQuality.station_id == payload.station_id)
        .order_by(desc(AirQuality.timestamp))
        .first()
    )
    if not latest_aq:
        raise HTTPException(status_code=400, detail="No readings found for station")

    target_ts = latest_aq.timestamp
    initial_pm25 = round(float(latest_aq.pm25), 1)

    initial_det = detect_station_latest_anomaly(db, payload.station_id, persist=False)
    base_mean = initial_det.get("baseline_mean", 80.0)
    if base_mean <= 0:
        base_mean = 80.0

    simulated_pm25 = round(base_mean * (1.0 + (payload.magnitude_pct / 100.0)), 1)

    latest_aq.pm25 = simulated_pm25
    latest_aq.pm10 = round(simulated_pm25 * 1.8, 1)
    latest_aq.timestamp = target_ts

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
    f1 = f_items[0]["pm25"] if len(f_items) > 0 else simulated_pm25
    f3 = f_items[1]["pm25"] if len(f_items) > 1 else simulated_pm25
    f6 = f_items[2]["pm25"] if len(f_items) > 2 else simulated_pm25

    # 4. Alert Generation with SIMULATION provenance
    new_alert = evaluate_and_update_station_alert(
        db=db,
        station_id=payload.station_id,
        current_pm25=simulated_pm25,
        deviation_pct=anomaly_res.get("deviation_pct", payload.magnitude_pct),
        is_anomaly=anomaly_res.get("is_anomaly", True),
        anomaly_severity=anomaly_res.get("severity", "high"),
        factors=context_res.get("factors", []),
        forecast_1h=f1,
        forecast_3h=f3,
        forecast_6h=f6,
        provenance="SIMULATION",
    )

    alert_dict = None
    if new_alert:
        new_alert.status = "ACTIVE"
        new_alert.is_broadcast = False
        new_alert.region = station.region or "Delhi"
        new_alert.created_at = target_ts
        new_alert.provenance = "SIMULATION"
        db.commit()
        alert_dict = {
            "id": new_alert.id,
            "risk_level": new_alert.risk_level,
            "title": new_alert.title,
            "message": new_alert.message,
            "status": new_alert.status,
            "is_broadcast": new_alert.is_broadcast,
            "provenance": "SIMULATION",
            "forecast_pm25_6h": new_alert.forecast_pm25_6h,
        }

    scenario_name = payload.scenario_type or "PM2.5 Surge"

    recommended_response = [
        "Review Alert details in Authority Broadcast Command.",
        "Verify contextual traffic and meteorological dispersion factors.",
        "Initiate targeted citizen broadcast to notify vulnerable populations.",
        "Consider municipal traffic rerouting or construction pauses if alert persists."
    ]

    return WhatIfScenarioResponse(
        status="ok",
        message=f"[SIMULATION] Executed {scenario_name} (+{payload.magnitude_pct}%) in {station.name}. Alert generated for authority review.",
        is_simulation=True,
        is_demo_simulation=True,
        provenance="SIMULATION",
        source_label="Authority What-If Scenario",
        scenario_type=scenario_name,
        station_id=payload.station_id,
        station_name=station.name,
        region=station.region,
        current_pm25=initial_pm25,
        simulated_pm25=simulated_pm25,
        timestamp_utc=format_ist_iso(target_ts),
        anomaly=anomaly_res,
        context=context_res,
        forecast=forecast_res,
        alert=alert_dict,
        recommended_response=recommended_response,
    )


@router.post("/reset")
def reset_simulation(db: Session = Depends(get_db)):
    """Reset simulation back to pristine dataset with clean baseline state."""
    from scripts.seed_db import seed_database
    seed_database(reset=True)
    db.expire_all()

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
            provenance="LIVE",
        )

    return {"status": "ok", "message": "Simulation data reset successfully to pristine baseline state."}
