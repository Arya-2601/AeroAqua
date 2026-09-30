"""
Risk Assessment and Early Warning Alerts Service for AeroAqua
Computes risk level (NORMAL, WATCH, WARNING, CRITICAL) and creates non-duplicate
human-readable early warnings with non-causal phrasing.
"""

from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..models import Alert, Station, AirQuality, Anomaly


def determine_risk_level(
    current_pm25: float,
    is_anomaly: bool,
    anomaly_severity: str,
    forecast_1h: Optional[float] = None,
    forecast_3h: Optional[float] = None,
    forecast_6h: Optional[float] = None,
) -> str:
    """
    Risk Rules:
    - CRITICAL: Any of current or forecast PM2.5 > 250, OR critical anomaly
    - WARNING: Forecast (+3h or +6h) PM2.5 > 120, OR high anomaly
    - WATCH: Anomaly of any severity, OR forecast rising by >= 20% within 6h and reaching > 90
    - NORMAL: Otherwise
    """
    f1 = forecast_1h if forecast_1h is not None else current_pm25
    f3 = forecast_3h if forecast_3h is not None else current_pm25
    f6 = forecast_6h if forecast_6h is not None else current_pm25

    # Check CRITICAL
    if current_pm25 > 250.0 or f1 > 250.0 or f3 > 250.0 or f6 > 250.0 or anomaly_severity == "critical":
        return "CRITICAL"

    # Check WARNING
    if f3 > 120.0 or f6 > 120.0 or anomaly_severity == "high":
        return "WARNING"

    # Check WATCH
    is_rising_sharply = (f6 >= current_pm25 * 1.20) and (f6 > 90.0)
    if is_anomaly or is_rising_sharply:
        return "WATCH"

    return "NORMAL"


def generate_alert_content(
    station_name: str,
    risk_level: str,
    current_pm25: float,
    deviation_pct: float,
    factors: List[Dict[str, Any]],
    forecast_1h: Optional[float] = None,
    forecast_3h: Optional[float] = None,
    forecast_6h: Optional[float] = None,
) -> Dict[str, str]:
    """Generate title and non-causal early warning message."""
    if risk_level == "CRITICAL":
        title = f"CRITICAL: Severe pollution alert for {station_name}"
    elif risk_level == "WARNING":
        title = f"Elevated pollution risk expected in {station_name}"
    elif risk_level == "WATCH":
        title = f"Advisory: Unusual air quality pattern in {station_name}"
    else:
        title = f"Normal conditions in {station_name}"

    # Extract top 2-3 factors for the message
    factor_snippets = []
    for f in factors[:3]:
        # Strip trailing punctuation for smooth sentence embedding
        text = f.get("text", "").split(" — ")[0].rstrip(". ")
        factor_snippets.append(text)

    factor_text = ", ".join(factor_snippets) if factor_snippets else "local geospatial conditions"

    dev_text = f", {int(deviation_pct)}% above normal level for this hour" if deviation_pct > 0 else ""
    forecast_parts = []
    if forecast_1h is not None:
        forecast_parts.append(f"{int(round(forecast_1h))} (+1h)")
    if forecast_3h is not None:
        forecast_parts.append(f"{int(round(forecast_3h))} (+3h)")
    if forecast_6h is not None:
        forecast_parts.append(f"{int(round(forecast_6h))} (+6h)")

    forecast_str = f" Forecast: {', '.join(forecast_parts)} µg/m³." if forecast_parts else ""

    message = (
        f"PM2.5 is {round(current_pm25, 1)} µg/m³{dev_text}. "
        f"Potentially relevant factors: {factor_text}.{forecast_str}"
    )

    return {"title": title, "message": message}


def evaluate_and_update_station_alert(
    db: Session,
    station_id: int,
    current_pm25: float,
    deviation_pct: float,
    is_anomaly: bool,
    anomaly_severity: str,
    factors: List[Dict[str, Any]],
    forecast_1h: Optional[float] = None,
    forecast_3h: Optional[float] = None,
    forecast_6h: Optional[float] = None,
) -> Optional[Alert]:
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        return None

    risk_level = determine_risk_level(
        current_pm25=current_pm25,
        is_anomaly=is_anomaly,
        anomaly_severity=anomaly_severity,
        forecast_1h=forecast_1h,
        forecast_3h=forecast_3h,
        forecast_6h=forecast_6h,
    )

    if risk_level == "NORMAL":
        # Deactivate any active alerts for this station
        db.query(Alert).filter(
            Alert.station_id == station_id,
            Alert.is_active.is_(True)
        ).update({"is_active": False})
        db.commit()
        return None

    # Check if an active alert already exists with the same risk level
    existing_alert = db.query(Alert).filter(
        Alert.station_id == station_id,
        Alert.risk_level == risk_level,
        Alert.is_active.is_(True)
    ).first()

    if existing_alert:
        # Do not create duplicate active alert
        return existing_alert

    # Deactivate previous alerts with different levels
    db.query(Alert).filter(
        Alert.station_id == station_id,
        Alert.is_active.is_(True)
    ).update({"is_active": False})

    content = generate_alert_content(
        station_name=station.name,
        risk_level=risk_level,
        current_pm25=current_pm25,
        deviation_pct=deviation_pct,
        factors=factors,
        forecast_1h=forecast_1h,
        forecast_3h=forecast_3h,
        forecast_6h=forecast_6h,
    )

    new_alert = Alert(
        station_id=station_id,
        risk_level=risk_level,
        title=content["title"],
        message=content["message"],
        current_pm25=round(current_pm25, 1),
        forecast_pm25_6h=round(forecast_6h, 1) if forecast_6h is not None else None,
        is_active=True,
    )
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert
