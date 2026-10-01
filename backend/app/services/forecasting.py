"""
Forecasting Service for AeroAqua
Loads trained XGBoost artifacts, constructs real-time inference features,
and predicts PM2.5 at +1h, +3h, and +6h with category, color, and confidence range.
"""

import json
import os
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
import joblib
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..models import Station, AirQuality, Weather, Traffic, Event, Anomaly
from ..ml.features import build_inference_features, FEATURE_COLUMNS
from ..ml.train import train_models
from .aqi import get_aqi_info
from .alerts import determine_risk_level
from .datetime_service import format_ist_iso

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "ml", "artifacts")

_loaded_models = {}
_loaded_metrics = {}


def load_artifacts():
    global _loaded_models, _loaded_metrics
    m1_path = os.path.join(ARTIFACTS_DIR, "model_1h.joblib")
    m3_path = os.path.join(ARTIFACTS_DIR, "model_3h.joblib")
    m6_path = os.path.join(ARTIFACTS_DIR, "model_6h.joblib")
    metrics_path = os.path.join(ARTIFACTS_DIR, "metrics.json")

    if not (os.path.exists(m1_path) and os.path.exists(m3_path) and os.path.exists(m6_path)):
        print("Model artifacts not found. Initiating training...")
        train_models()

    if not _loaded_models:
        _loaded_models["1h"] = joblib.load(m1_path)
        _loaded_models["3h"] = joblib.load(m3_path)
        _loaded_models["6h"] = joblib.load(m6_path)

    if not _loaded_metrics and os.path.exists(metrics_path):
        with open(metrics_path, "r", encoding="utf-8") as f:
            _loaded_metrics = json.load(f)


def forecast_station_pm25(
    db: Session,
    station_id: int,
    target_dt: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Generate multi-horizon forecast (+1h, +3h, +6h) for a station.
    Execution completes in < 1 second.
    """
    start_time = time.time()
    load_artifacts()

    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        return {}

    # Query recent 30 hours of PM2.5 readings for lag and rolling calculations
    aq_query = db.query(AirQuality).filter(AirQuality.station_id == station_id)
    if target_dt:
        aq_query = aq_query.filter(AirQuality.timestamp <= target_dt)
    recent_readings = aq_query.order_by(desc(AirQuality.timestamp)).limit(30).all()
    recent_readings.reverse()  # Chronological order

    if not recent_readings:
        return {}

    latest_reading = recent_readings[-1]
    curr_ts = latest_reading.timestamp
    curr_pm25 = float(latest_reading.pm25)

    history_pm25_series = [float(r.pm25) for r in recent_readings]

    # Query latest weather
    weather = db.query(Weather).filter(
        Weather.station_id == station_id,
        Weather.timestamp <= curr_ts
    ).order_by(desc(Weather.timestamp)).first()

    current_weather = {
        "temperature": weather.temperature if weather else 26.0,
        "humidity": weather.humidity if weather else 55.0,
        "wind_speed": weather.wind_speed if weather else 2.5,
        "wind_direction": weather.wind_direction if weather else 280.0,
        "rainfall": weather.rainfall if weather else 0.0,
    }

    # Query latest traffic
    traffic = db.query(Traffic).filter(
        Traffic.station_id == station_id,
        Traffic.timestamp <= curr_ts
    ).order_by(desc(Traffic.timestamp)).first()
    current_traffic = traffic.traffic_index if traffic else 50

    # Query events
    all_events = db.query(Event).all()
    events_list = [
        {
            "latitude": ev.latitude,
            "longitude": ev.longitude,
            "start_time": ev.start_time,
            "end_time": ev.end_time,
            "affected_radius_km": ev.affected_radius_km,
        }
        for ev in all_events
    ]

    station_meta = {
        "latitude": station.latitude,
        "longitude": station.longitude,
        "major_road_count_2km": station.major_road_count_2km,
        "distance_to_highway_m": station.distance_to_highway_m,
        "industrial_distance_km": station.industrial_distance_km,
    }

    # Build inference features
    X_infer = build_inference_features(
        history_pm25_series=history_pm25_series,
        current_weather=current_weather,
        current_traffic_index=current_traffic,
        station_meta=station_meta,
        target_dt=curr_ts,
        events=events_list
    )

    # Predict horizons
    pred_1h = float(_loaded_models["1h"].predict(X_infer)[0])
    pred_3h = float(_loaded_models["3h"].predict(X_infer)[0])
    pred_6h = float(_loaded_models["6h"].predict(X_infer)[0])

    # Minimum bound
    pred_1h = max(5.0, pred_1h)
    pred_3h = max(5.0, pred_3h)
    pred_6h = max(5.0, pred_6h)

    mae_1h = _loaded_metrics.get("1h", {}).get("mae", 5.0)
    mae_3h = _loaded_metrics.get("3h", {}).get("mae", 7.0)
    mae_6h = _loaded_metrics.get("6h", {}).get("mae", 10.0)

    cat_1h = get_aqi_info(pred_1h)
    cat_3h = get_aqi_info(pred_3h)
    cat_6h = get_aqi_info(pred_6h)
    curr_cat = get_aqi_info(curr_pm25)

    # Check active anomaly severity for risk evaluation
    active_anomaly = db.query(Anomaly).filter(
        Anomaly.station_id == station_id,
        Anomaly.is_active.is_(True)
    ).first()

    is_anomaly = active_anomaly is not None
    anomaly_severity = active_anomaly.severity if active_anomaly else "none"

    risk_level = determine_risk_level(
        current_pm25=curr_pm25,
        is_anomaly=is_anomaly,
        anomaly_severity=anomaly_severity,
        forecast_1h=pred_1h,
        forecast_3h=pred_3h,
        forecast_6h=pred_6h,
    )

    forecast_items = [
        {
            "horizon_hours": 1,
            "pm25": round(pred_1h, 1),
            "category": cat_1h["category"],
            "color": cat_1h["color"],
            "range": [round(max(0.0, pred_1h - mae_1h), 1), round(pred_1h + mae_1h, 1)]
        },
        {
            "horizon_hours": 3,
            "pm25": round(pred_3h, 1),
            "category": cat_3h["category"],
            "color": cat_3h["color"],
            "range": [round(max(0.0, pred_3h - mae_3h), 1), round(pred_3h + mae_3h, 1)]
        },
        {
            "horizon_hours": 6,
            "pm25": round(pred_6h, 1),
            "category": cat_6h["category"],
            "color": cat_6h["color"],
            "range": [round(max(0.0, pred_6h - mae_6h), 1), round(pred_6h + mae_6h, 1)]
        }
    ]

    elapsed = time.time() - start_time

    return {
        "station_id": station_id,
        "station_name": station.name,
        "current": {
            "pm25": round(curr_pm25, 1),
            "category": curr_cat["category"],
            "color": curr_cat["color"],
            "timestamp": format_ist_iso(curr_ts),
        },
        "forecast": forecast_items,
        "risk_level": risk_level,
        "inference_time_ms": round(elapsed * 1000.0, 1),
    }
