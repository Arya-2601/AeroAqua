"""
Simulation Router for AeroAqua API
Allows interactive demo testing:
- POST /api/simulate/spike: Injects an elevated reading at a station and triggers live re-detection.
- POST /api/simulate/reset: Restores baseline synthetic dataset.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Station, AirQuality, Traffic
from ..schemas import SimulateSpikeRequest, SimulateSpikeResponse, SimulateResetResponse
from ..services.anomaly import detect_station_latest_anomaly
from ..services.correlation import get_station_correlation_context
from ..services.forecasting import forecast_station_pm25
from ..services.alerts import evaluate_and_update_station_alert

router = APIRouter(prefix="/api/simulate", tags=["Simulation"])


@router.post("/spike", response_model=SimulateSpikeResponse)
def simulate_spike(payload: SimulateSpikeRequest, db: Session = Depends(get_db)):
    """Simulate a pollution spike for a given station and recompute detections, forecasts, and alerts."""
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

    # Fetch baseline detection to get baseline_mean
    initial_detection = detect_station_latest_anomaly(db, payload.station_id, persist=False)
    base_mean = initial_detection.get("baseline_mean", station.distance_to_highway_m)
    if base_mean <= 0:
        base_mean = 80.0

    # Calculate spiked PM2.5: baseline * (1 + magnitude_pct / 100)
    spiked_pm25 = round(base_mean * (1.0 + (payload.magnitude_pct / 100.0)), 1)

    # Update latest air quality record
    latest_aq.pm25 = spiked_pm25
    latest_aq.pm10 = round(spiked_pm25 * 1.8, 1)

    # Also moderately boost traffic if high magnitude
    latest_traffic = (
        db.query(Traffic)
        .filter(Traffic.station_id == payload.station_id)
        .order_by(desc(Traffic.timestamp))
        .first()
    )
    if latest_traffic and payload.magnitude_pct >= 50:
        latest_traffic.traffic_index = min(95, latest_traffic.traffic_index + 20)

    db.commit()

    # 1. Re-run Anomaly Detection (persisting new active anomaly)
    anomaly_res = detect_station_latest_anomaly(db, payload.station_id, persist=True)

    # 2. Re-run Correlation Context
    context_res = get_station_correlation_context(db, payload.station_id)

    # 3. Re-run Forecast
    forecast_res = forecast_station_pm25(db, payload.station_id)

    forecast_items = forecast_res.get("forecast", [])
    f1 = forecast_items[0]["pm25"] if len(forecast_items) > 0 else spiked_pm25
    f3 = forecast_items[1]["pm25"] if len(forecast_items) > 1 else spiked_pm25
    f6 = forecast_items[2]["pm25"] if len(forecast_items) > 2 else spiked_pm25

    # 4. Re-run Alert Evaluation
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

    alert_dict = {
        "id": new_alert.id,
        "risk_level": new_alert.risk_level,
        "title": new_alert.title,
        "message": new_alert.message,
    } if new_alert else None

    return SimulateSpikeResponse(
        status="ok",
        message=f"Simulated {payload.magnitude_pct}% spike for {station.name}. New PM2.5 is {spiked_pm25} µg/m³.",
        station_id=payload.station_id,
        updated_pm25=spiked_pm25,
        anomaly=anomaly_res,
        forecast=forecast_res,
        alert=alert_dict,
    )


@router.post("/reset", response_model=SimulateResetResponse)
def simulate_reset(db: Session = Depends(get_db)):
    """Reset data to the pristine seeded demo dataset."""
    from scripts.seed_db import seed_database
    from ..services.anomaly import detect_all_stations_anomalies
    from ..services.correlation import get_station_correlation_context
    from ..services.forecasting import forecast_station_pm25

    # Re-seed database from raw CSVs
    seed_database(reset=True)

    # Populate initial anomalies & alerts across all stations
    anom_results = detect_all_stations_anomalies(db, persist=True)

    # For Zone B (which is an anomaly by design), ensure alert is also created
    zone_b_anom = next((a for a in anom_results if a["station_id"] == 2), None)
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

    return SimulateResetResponse(
        status="ok",
        message="Demo data reset to initial baseline state successfully."
    )
