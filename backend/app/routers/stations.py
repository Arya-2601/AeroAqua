"""
Stations Router for AeroAqua API
Provides station listings, station details, readings time-series, context, and forecast.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Station, AirQuality, Weather, Traffic, Anomaly, Alert
from ..schemas import (
    StationSummary, StationDetail, StationReadingsResponse, ReadingItem,
    StationContextResponse, StationForecastResponse
)
from ..services.aqi import get_aqi_info
from ..services.anomaly import detect_station_latest_anomaly, calculate_baseline, evaluate_reading_anomaly
from ..services.correlation import get_station_correlation_context
from ..services.forecasting import forecast_station_pm25
from ..services.alerts import determine_risk_level

router = APIRouter(prefix="/api/stations", tags=["Stations"])


@router.get("", response_model=List[StationSummary])
def get_stations(db: Session = Depends(get_db)):
    """List all stations with latest PM2.5, category, color, risk_level, and anomaly status."""
    stations = db.query(Station).all()
    results = []

    for s in stations:
        latest_aq = (
            db.query(AirQuality)
            .filter(AirQuality.station_id == s.id)
            .order_by(desc(AirQuality.timestamp))
            .first()
        )

        curr_pm25 = float(latest_aq.pm25) if latest_aq else 0.0
        ts_str = latest_aq.timestamp.isoformat() if latest_aq else None
        aqi_info = get_aqi_info(curr_pm25)

        # Check active anomaly
        active_anomaly = (
            db.query(Anomaly)
            .filter(Anomaly.station_id == s.id, Anomaly.is_active.is_(True))
            .first()
        )

        if active_anomaly:
            is_anomaly = True
            dev_pct = float(active_anomaly.deviation_pct)
            severity = active_anomaly.severity
        else:
            # Quick anomaly check
            det = detect_station_latest_anomaly(db, s.id, persist=False)
            is_anomaly = det.get("is_anomaly", False)
            dev_pct = det.get("deviation_pct", 0.0)
            severity = det.get("severity", "none")

        # Check active alert
        active_alert = (
            db.query(Alert)
            .filter(Alert.station_id == s.id, Alert.is_active.is_(True))
            .first()
        )
        if active_alert:
            risk_level = active_alert.risk_level
        else:
            risk_level = determine_risk_level(curr_pm25, is_anomaly, severity)

        results.append(StationSummary(
            id=s.id,
            name=s.name,
            latitude=s.latitude,
            longitude=s.longitude,
            zone_profile=s.zone_profile,
            current_pm25=round(curr_pm25, 1),
            category=aqi_info["category"],
            color=aqi_info["color"],
            risk_level=risk_level,
            is_anomaly=is_anomaly,
            deviation_pct=round(dev_pct, 1),
            severity=severity,
            last_updated=ts_str
        ))

    return results


@router.get("/{station_id}", response_model=StationDetail)
def get_station_detail(station_id: int, db: Session = Depends(get_db)):
    """Retrieve detailed information for a single station."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    latest_aq = (
        db.query(AirQuality)
        .filter(AirQuality.station_id == station_id)
        .order_by(desc(AirQuality.timestamp))
        .first()
    )
    curr_pm25 = float(latest_aq.pm25) if latest_aq else 0.0
    aqi_info = get_aqi_info(curr_pm25)

    latest_weather = (
        db.query(Weather)
        .filter(Weather.station_id == station_id)
        .order_by(desc(Weather.timestamp))
        .first()
    )
    latest_traffic = (
        db.query(Traffic)
        .filter(Traffic.station_id == station_id)
        .order_by(desc(Traffic.timestamp))
        .first()
    )

    det = detect_station_latest_anomaly(db, station_id, persist=False)
    is_anomaly = det.get("is_anomaly", False)
    dev_pct = det.get("deviation_pct", 0.0)
    severity = det.get("severity", "none")

    active_alert = (
        db.query(Alert)
        .filter(Alert.station_id == station_id, Alert.is_active.is_(True))
        .first()
    )
    risk_level = active_alert.risk_level if active_alert else determine_risk_level(curr_pm25, is_anomaly, severity)

    w_dict = {
        "temperature": latest_weather.temperature,
        "humidity": latest_weather.humidity,
        "wind_speed": latest_weather.wind_speed,
        "wind_direction": latest_weather.wind_direction,
        "rainfall": latest_weather.rainfall,
    } if latest_weather else None

    t_dict = {
        "traffic_index": latest_traffic.traffic_index
    } if latest_traffic else None

    return StationDetail(
        id=station.id,
        name=station.name,
        latitude=station.latitude,
        longitude=station.longitude,
        zone_profile=station.zone_profile,
        major_road_count_2km=station.major_road_count_2km,
        distance_to_highway_m=station.distance_to_highway_m,
        distance_to_major_road_m=station.distance_to_major_road_m,
        road_density=station.road_density,
        industrial_distance_km=station.industrial_distance_km,
        current_pm25=round(curr_pm25, 1),
        category=aqi_info["category"],
        color=aqi_info["color"],
        risk_level=risk_level,
        is_anomaly=is_anomaly,
        deviation_pct=round(dev_pct, 1),
        severity=severity,
        latest_weather=w_dict,
        latest_traffic=t_dict,
    )


@router.get("/{station_id}/readings", response_model=StationReadingsResponse)
def get_station_readings(
    station_id: int,
    hours: int = Query(48, ge=6, le=168),
    db: Session = Depends(get_db)
):
    """Retrieve historical time series of PM2.5 with baseline mean and upper band (mean + 2.5*std)."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    latest_aq = (
        db.query(AirQuality)
        .filter(AirQuality.station_id == station_id)
        .order_by(desc(AirQuality.timestamp))
        .first()
    )
    if not latest_aq:
        return StationReadingsResponse(
            station_id=station_id,
            station_name=station.name,
            hours=hours,
            readings=[]
        )

    end_ts = latest_aq.timestamp
    start_ts = end_ts - timedelta(hours=hours - 1)

    readings = (
        db.query(AirQuality)
        .filter(
            AirQuality.station_id == station_id,
            AirQuality.timestamp >= start_ts,
            AirQuality.timestamp <= end_ts
        )
        .order_by(AirQuality.timestamp)
        .all()
    )

    items = []
    # Pre-fetch historical 14-day data for baseline calculations
    hist_start = start_ts - timedelta(days=14)
    all_hist = (
        db.query(AirQuality)
        .filter(
            AirQuality.station_id == station_id,
            AirQuality.timestamp >= hist_start,
            AirQuality.timestamp <= end_ts
        )
        .all()
    )

    # Index by (hour, is_weekend) for rapid baseline estimation
    hist_by_hour = {}
    for h in all_hist:
        k = (h.timestamp.hour, h.timestamp.weekday() >= 5)
        hist_by_hour.setdefault(k, []).append(h.pm25)

    for r in readings:
        r_hour = r.timestamp.hour
        r_wknd = r.timestamp.weekday() >= 5
        samples = hist_by_hour.get((r_hour, r_wknd), [])
        if len(samples) < 5:
            # Fallback to all days for this hour
            samples = [h.pm25 for h in all_hist if h.timestamp.hour == r_hour]
        if not samples:
            samples = [r.pm25]

        mean_val, std_val = calculate_baseline(samples)
        upper_val = mean_val + 2.5 * std_val

        # Check if point is an anomaly
        eval_res = evaluate_reading_anomaly(r.pm25, mean_val, std_val)

        items.append(ReadingItem(
            timestamp=r.timestamp.isoformat(),
            pm25=round(float(r.pm25), 1),
            baseline_mean=round(mean_val, 1),
            baseline_upper=round(upper_val, 1),
            is_anomaly=eval_res["is_anomaly"]
        ))

    return StationReadingsResponse(
        station_id=station_id,
        station_name=station.name,
        hours=hours,
        readings=items
    )


@router.get("/{station_id}/context", response_model=StationContextResponse)
def get_station_context(station_id: int, db: Session = Depends(get_db)):
    """Retrieve correlation output (potentially relevant factors) for latest reading."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    context = get_station_correlation_context(db, station_id)
    return context


@router.get("/{station_id}/forecast", response_model=StationForecastResponse)
def get_station_forecast(station_id: int, db: Session = Depends(get_db)):
    """Retrieve multi-horizon forecast (+1h, +3h, +6h) for the station."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    forecast = forecast_station_pm25(db, station_id)
    return forecast
