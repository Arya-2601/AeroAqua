"""
Anomaly Detection Service for AeroAqua
Computes 14-day same-hour baselines, calculates z-score and deviation percentage,
classifies severity, and updates the anomalies table.
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any, List
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..models import AirQuality, Anomaly, Station


def calculate_baseline(
    readings: List[float]
) -> Tuple[float, float]:
    """
    Given a list of historical PM2.5 values, compute (baseline_mean, baseline_std).
    Floors baseline_std at 5% of baseline_mean (or 0.1 minimum) to avoid division by near-zero.
    """
    if not readings:
        return 0.0, 1.0

    mean_val = float(np.mean(readings))
    std_val = float(np.std(readings, ddof=1)) if len(readings) > 1 else 0.0

    # Floor std at 5% of mean (or 0.1)
    min_std = max(0.05 * mean_val, 0.1)
    effective_std = max(std_val, min_std)

    return round(mean_val, 2), round(effective_std, 2)


def evaluate_reading_anomaly(
    current_pm25: float,
    baseline_mean: float,
    baseline_std: float,
) -> Dict[str, Any]:
    """
    Deterministic rule:
    z_score = (current - baseline_mean) / baseline_std
    deviation_pct = (current - baseline_mean) / baseline_mean * 100
    Anomaly if z_score >= 2.5 OR (deviation_pct >= 40 AND z_score >= 1.5)
    Severity:
      - critical if z_score > 5.0 or current_pm25 > 250
      - high if 3.5 <= z_score <= 5.0
      - moderate if 2.5 <= z_score < 3.5 (or deviation triggered)
    """
    curr = float(current_pm25)
    mean_val = float(baseline_mean)
    std_val = float(baseline_std)

    if mean_val <= 0:
        mean_val = 1.0
    if std_val <= 0:
        std_val = max(0.05 * mean_val, 0.1)

    z_score = (curr - mean_val) / std_val
    deviation_pct = ((curr - mean_val) / mean_val) * 100.0

    is_anomaly = bool(z_score >= 2.5 or (deviation_pct >= 40.0 and z_score >= 1.5))

    # Anomaly score: clamp(z_score / 5, 0, 1) * 100
    raw_score = (z_score / 5.0)
    anomaly_score = float(np.clip(raw_score, 0.0, 1.0) * 100.0)

    severity = "none"
    if is_anomaly:
        if z_score > 5.0 or curr > 250.0:
            severity = "critical"
        elif z_score >= 3.5:
            severity = "high"
        else:
            severity = "moderate"

    return {
        "is_anomaly": is_anomaly,
        "pm25": round(curr, 1),
        "baseline_mean": round(mean_val, 2),
        "baseline_std": round(std_val, 2),
        "z_score": round(z_score, 2),
        "deviation_pct": round(deviation_pct, 1),
        "anomaly_score": round(anomaly_score, 1),
        "severity": severity,
    }


def detect_station_latest_anomaly(
    db: Session,
    station_id: int,
    target_dt: Optional[datetime] = None,
    persist: bool = True
) -> Dict[str, Any]:
    """
    Fetch the latest reading for a station, build a 14-day baseline for the same hour
    (and same weekday-type if >= 5 samples), evaluate anomaly status, and update DB.
    """
    # Find latest reading
    query = db.query(AirQuality).filter(AirQuality.station_id == station_id)
    if target_dt is not None:
        query = query.filter(AirQuality.timestamp <= target_dt)
    latest_reading = query.order_by(desc(AirQuality.timestamp)).first()

    if not latest_reading:
        return {
            "station_id": station_id,
            "is_anomaly": False,
            "z_score": 0.0,
            "deviation_pct": 0.0,
            "severity": "none",
            "anomaly_score": 0.0,
            "baseline_mean": 0.0,
            "baseline_std": 1.0,
            "pm25": 0.0,
            "timestamp": None,
        }

    curr_ts = latest_reading.timestamp
    curr_hour = curr_ts.hour
    is_weekend = curr_ts.weekday() >= 5
    fourteen_days_ago = curr_ts - timedelta(days=14)

    # Historical readings in the previous 14 days strictly before curr_ts
    hist_query = db.query(AirQuality).filter(
        AirQuality.station_id == station_id,
        AirQuality.timestamp >= fourteen_days_ago,
        AirQuality.timestamp < curr_ts
    ).all()

    # Filter to same hour
    same_hour_readings = [r for r in hist_query if r.timestamp.hour == curr_hour]

    # Filter to same weekday type if >= 5 samples, else all days
    weekday_type_readings = [
        r.pm25 for r in same_hour_readings
        if (r.timestamp.weekday() >= 5) == is_weekend
    ]

    if len(weekday_type_readings) >= 5:
        selected_samples = weekday_type_readings
    elif same_hour_readings:
        selected_samples = [r.pm25 for r in same_hour_readings]
    else:
        # Fallback if sparse
        selected_samples = [r.pm25 for r in hist_query] if hist_query else [latest_reading.pm25]

    baseline_mean, baseline_std = calculate_baseline(selected_samples)
    eval_result = evaluate_reading_anomaly(latest_reading.pm25, baseline_mean, baseline_std)
    eval_result["station_id"] = station_id
    eval_result["timestamp"] = curr_ts

    if persist:
        # If normal, mark any older active anomalies for this station as inactive
        if not eval_result["is_anomaly"]:
            db.query(Anomaly).filter(
                Anomaly.station_id == station_id,
                Anomaly.is_active.is_(True)
            ).update({"is_active": False})
            db.commit()
        else:
            # Check if this anomaly already exists for this station + timestamp
            existing = db.query(Anomaly).filter(
                Anomaly.station_id == station_id,
                Anomaly.timestamp == curr_ts
            ).first()

            if not existing:
                # Deactivate older active anomalies first
                db.query(Anomaly).filter(
                    Anomaly.station_id == station_id,
                    Anomaly.is_active.is_(True)
                ).update({"is_active": False})

                new_anomaly = Anomaly(
                    station_id=station_id,
                    timestamp=curr_ts,
                    pm25=eval_result["pm25"],
                    baseline_mean=eval_result["baseline_mean"],
                    baseline_std=eval_result["baseline_std"],
                    z_score=eval_result["z_score"],
                    deviation_pct=eval_result["deviation_pct"],
                    anomaly_score=eval_result["anomaly_score"],
                    severity=eval_result["severity"],
                    is_active=True,
                )
                db.add(new_anomaly)
                db.commit()

    return eval_result


def detect_all_stations_anomalies(db: Session, persist: bool = True) -> List[Dict[str, Any]]:
    """Run anomaly detection across all registered stations."""
    stations = db.query(Station).all()
    results = []
    for s in stations:
        res = detect_station_latest_anomaly(db, s.id, persist=persist)
        results.append(res)
    return results
