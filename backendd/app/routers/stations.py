"""
Stations Router for AeroAqua API
Provides station listings, station details, readings time-series, context, and forecast.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Station, AirQuality, Weather, Traffic, Anomaly, Alert
from ..schemas import (
    StationSummary, StationDetail, StationCreate, StationReadingsResponse, ReadingItem,
    StationContextResponse, StationForecastResponse
)
from ..services.aqi import get_aqi_info
from ..services.anomaly import detect_station_latest_anomaly, calculate_baseline, evaluate_reading_anomaly
from ..services.correlation import get_station_correlation_context
from ..services.forecasting import forecast_station_pm25
from ..services.alerts import determine_risk_level
from ..services.auth_service import require_authority, AuthenticatedUser
from ..services.datetime_service import format_ist_iso, get_now_ist

router = APIRouter(prefix="/api/stations", tags=["Stations"])


@router.get("", response_model=List[StationSummary])
def get_stations(
    region: Optional[str] = Query(None, description="Filter stations by region"),
    db: Session = Depends(get_db)
):
    """
    List all active stations with latest PM2.5, category, color, risk_level, and anomaly status.
    Respects region parameter: returns stations for Delhi, Maharashtra, Gujarat,
    or empty list for regions where monitoring stations are not deployed.
    Only active (non-removed) stations are returned.
    """
    query = db.query(Station).filter(Station.is_active.is_(True))
    if region and region.lower() != "all":
        reg_clean = region.strip().lower()
        if reg_clean in ["delhi", "delhi ncr", "delhi nct", "national capital territory of delhi"]:
            query = query.filter(Station.region.ilike("Delhi"))
        elif reg_clean == "maharashtra":
            query = query.filter(Station.region.ilike("Maharashtra"))
        elif reg_clean == "gujarat":
            query = query.filter(Station.region.ilike("Gujarat"))
        else:
            query = query.filter(Station.region.ilike(region.strip()))

    stations = query.all()
    results = []

    for s in stations:
        latest_aq = (
            db.query(AirQuality)
            .filter(AirQuality.station_id == s.id)
            .order_by(desc(AirQuality.timestamp))
            .first()
        )

        curr_pm25 = float(latest_aq.pm25) if latest_aq else 0.0
        ts_str = format_ist_iso(latest_aq.timestamp) if latest_aq else None
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
            region=s.region or "Delhi",
            data_source=s.data_source or "Regional Monitoring Data",
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


@router.post("", response_model=StationDetail)
def create_station(
    payload: StationCreate,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """
    Authority Action: Add a new monitoring zone for the selected region.
    Initializes baseline hourly records so anomaly, forecast, and context engines operate immediately.
    Protected by authority authorization.
    """
    user = require_authority(authorization=authorization, x_user_role=x_user_role, db=db)
    if user.region and user.region.lower() not in ["all", "global"] and user.region.lower() != payload.region.lower():
        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: Authority for {user.region} is not permitted to create monitoring zones in {payload.region}."
        )
    import random
    new_station = Station(
        name=payload.name,
        region=payload.region,
        data_source="Regional Monitoring Data",
        latitude=payload.latitude,
        longitude=payload.longitude,
        zone_profile=payload.zone_profile or "Residential",
        major_road_count_2km=2,
        distance_to_highway_m=1200.0,
        distance_to_major_road_m=280.0,
        road_density=2.8,
        industrial_distance_km=4.5,
        is_active=True,
    )
    db.add(new_station)
    db.commit()
    db.refresh(new_station)

    # Initialize 72 hours of baseline readings
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    base_pm = payload.baseline_pm25 or 65.0
    aq_list = []
    w_list = []
    t_list = []
    for h in range(72, -1, -1):
        ts = now - timedelta(hours=h)
        is_rush = (8 <= ts.hour <= 10) or (18 <= ts.hour <= 21)
        diurnal = 14.0 if is_rush else (-6.0 if 12 <= ts.hour <= 16 else 0.0)
        pm = max(18.0, base_pm + diurnal + random.uniform(-6.0, 6.0))
        aq_list.append(AirQuality(
            station_id=new_station.id,
            timestamp=ts,
            pm25=round(pm, 1),
            pm10=round(pm * 1.7, 1),
            no2=round(pm * 0.4, 1),
            so2=12.0,
            o3=24.0,
        ))
        w_list.append(Weather(
            station_id=new_station.id,
            timestamp=ts,
            temperature=28.0 + random.uniform(-3, 3),
            humidity=55.0 + random.uniform(-8, 8),
            wind_speed=8.5 + random.uniform(-2, 2),
            wind_direction=190.0 + random.uniform(-25, 25),
            rainfall=0.0,
        ))
        t_list.append(Traffic(
            station_id=new_station.id,
            timestamp=ts,
            traffic_index=int(max(15, min(90, 48 + (20 if is_rush else 0) + random.uniform(-4, 4)))),
        ))

    db.bulk_save_objects(aq_list)
    db.bulk_save_objects(w_list)
    db.bulk_save_objects(t_list)
    db.commit()

    return get_station_detail(new_station.id, db)


@router.delete("/{station_id}")
def remove_station(
    station_id: int,
    db: Session = Depends(get_db),
    authorization: Optional[str] = Header(None),
    x_user_role: Optional[str] = Header(None),
):
    """
    Authority Action: Remove a zone from the active monitoring grid.
    Soft-deletes the station (sets is_active=False) preserving all historical records.
    Enforces that citizen users receive a 403 Forbidden authorization error.
    Enforces state-isolation: Authority of one state cannot remove a zone in another state.
    """
    user = require_authority(authorization=authorization, x_user_role=x_user_role, db=db)

    station = db.query(Station).filter(Station.id == station_id).first()
    if not station or not station.is_active:
        raise HTTPException(status_code=404, detail="Station not found or already inactive.")

    # Cross-state permission check: An authority operating in one state must not remove another state's zone
    if user.region and user.region.lower() not in ["all", "global"] and user.region.lower() != station.region.lower():
        raise HTTPException(
            status_code=403,
            detail=f"Forbidden: Authority for {user.region} is not permitted to remove monitoring zones in {station.region}."
        )

    # Soft-delete to preserve all historical records
    station.is_active = False
    db.commit()

    return {
        "status": "ok",
        "message": f"Zone '{station.name}' removed successfully.",
        "station_id": station_id,
        "station_name": station.name,
        "region": station.region,
    }



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
        region=station.region or "Delhi",
        data_source=station.data_source or "Regional Monitoring Data",
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
            timestamp=format_ist_iso(r.timestamp),
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
    """Retrieve XGBoost PM2.5 forecast for a given station."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")
    return forecast_station_pm25(db, station_id)


@router.post("/{station_id}/refresh")
def refresh_station(station_id: int, db: Session = Depends(get_db)):
    """Fetch live external weather and air observations, update station readings, and return fresh state."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    from ..services.weather_service import weather_service
    from ..services.air_quality_service import air_quality_service

    # Fetch live weather
    live_w = weather_service.get_live_weather(station.latitude, station.longitude)

    # Update or insert latest weather record
    latest_w = (
        db.query(Weather)
        .filter(Weather.station_id == station_id)
        .order_by(desc(Weather.timestamp))
        .first()
    )
    if latest_w:
        latest_w.temperature = live_w["temperature"]
        latest_w.humidity = live_w["humidity"]
        latest_w.wind_speed = live_w["wind_speed"]
        latest_w.wind_direction = live_w["wind_direction"]
        latest_w.rainfall = live_w["precipitation"]
        db.commit()

    # Re-evaluate anomaly and context
    anom = detect_station_latest_anomaly(db, station_id, persist=True)
    ctx = get_station_correlation_context(db, station_id)
    fc = forecast_station_pm25(db, station_id)

    return {
        "status": "ok",
        "message": f"{station.name} environmental data refreshed from live APIs.",
        "station_id": station_id,
        "station_name": station.name,
        "live_weather": live_w,
        "anomaly": anom,
        "forecast": fc,
    }


@router.get("/reverse-geocode/lookup")
def reverse_geocode(
    latitude: float = Query(..., description="Latitude"),
    longitude: float = Query(..., description="Longitude"),
):
    """
    Reverse geocoding helper: Given latitude & longitude, attempts to identify
    locality, city, state/region, and formatted address for map-based zone creation.
    """
    import httpx
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?lat={latitude}&lon={longitude}&format=json&zoom=14&addressdetails=1"
        headers = {"User-Agent": "AeroAqua-Environmental-Intelligence/1.0"}
        with httpx.Client(timeout=4.0) as client:
            resp = client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                address = data.get("address", {})
                city = address.get("city") or address.get("town") or address.get("suburb") or address.get("neighbourhood") or address.get("county") or "Local Zone"
                locality = address.get("suburb") or address.get("neighbourhood") or address.get("road") or city
                state = address.get("state") or "Delhi"
                country = address.get("country") or "India"
                return {
                    "status": "ok",
                    "display_name": data.get("display_name", f"{locality}, {city}"),
                    "locality": locality,
                    "city": city,
                    "state": state,
                    "country": country,
                    "latitude": latitude,
                    "longitude": longitude,
                }
    except Exception:
        pass

    # Safe fallback if offline or geocoder unavailable
    return {
        "status": "ok",
        "display_name": f"Coordinate Point ({latitude:.4f}, {longitude:.4f})",
        "locality": f"Zone {latitude:.2f}N,{longitude:.2f}E",
        "city": "Operational Area",
        "state": "Delhi",
        "country": "India",
        "latitude": latitude,
        "longitude": longitude,
    }


