import pytest
from app.services.alerts import determine_risk_level, generate_alert_content


def test_risk_levels():
    # CRITICAL: PM2.5 > 250 or critical anomaly
    assert determine_risk_level(current_pm25=260.0, is_anomaly=False, anomaly_severity="none") == "CRITICAL"
    assert determine_risk_level(current_pm25=100.0, is_anomaly=True, anomaly_severity="critical") == "CRITICAL"
    assert determine_risk_level(current_pm25=80.0, is_anomaly=False, anomaly_severity="none", forecast_6h=255.0) == "CRITICAL"

    # WARNING: Forecast > 120 or high anomaly
    assert determine_risk_level(current_pm25=95.0, is_anomaly=False, anomaly_severity="none", forecast_3h=130.0) == "WARNING"
    assert determine_risk_level(current_pm25=90.0, is_anomaly=True, anomaly_severity="high") == "WARNING"

    # WATCH: Anomaly of any severity or forecast rising >= 20% and reaching > 90
    assert determine_risk_level(current_pm25=80.0, is_anomaly=True, anomaly_severity="moderate") == "WATCH"
    assert determine_risk_level(current_pm25=80.0, is_anomaly=False, anomaly_severity="none", forecast_6h=100.0) == "WATCH"

    # NORMAL: Otherwise
    assert determine_risk_level(current_pm25=65.0, is_anomaly=False, anomaly_severity="none", forecast_6h=70.0) == "NORMAL"


def test_non_causal_alert_phrasing():
    content = generate_alert_content(
        station_name="Zone B",
        risk_level="WARNING",
        current_pm25=154.0,
        deviation_pct=69.0,
        factors=[
            {"text": "Large public event 1.8 km away (active) — potentially relevant."},
            {"text": "Traffic index is HIGH (78) — correlated signal."}
        ],
        forecast_1h=162.0,
        forecast_3h=181.0,
        forecast_6h=205.0
    )

    # Check non-causality: cannot say 'caused by'
    assert "caused by" not in content["message"].lower()
    assert "potentially relevant" in content["message"].lower()
    assert "Zone B" in content["title"]
