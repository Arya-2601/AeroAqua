import pytest
from app.services.anomaly import calculate_baseline, evaluate_reading_anomaly


def test_baseline_std_floor():
    # Identical values has std = 0, floor must be applied
    identical_readings = [80.0, 80.0, 80.0, 80.0, 80.0]
    mean_val, std_val = calculate_baseline(identical_readings)
    assert mean_val == 80.0
    # Floor is max(0.05 * 80.0, 0.1) = 4.0
    assert std_val == 4.0
    assert std_val > 0


def test_normal_value_not_anomaly():
    # Normal reading close to mean
    baseline_mean = 90.0
    baseline_std = 9.0
    res = evaluate_reading_anomaly(current_pm25=92.0, baseline_mean=baseline_mean, baseline_std=baseline_std)
    assert not res["is_anomaly"]
    assert res["severity"] == "none"
    assert res["z_score"] < 1.0


def test_spike_triggers_anomaly():
    # +70% spike from baseline 90 is 153
    baseline_mean = 90.0
    baseline_std = 9.0
    res = evaluate_reading_anomaly(current_pm25=154.0, baseline_mean=baseline_mean, baseline_std=baseline_std)
    assert res["is_anomaly"]
    assert res["z_score"] >= 2.5
    assert res["deviation_pct"] > 60.0
    assert res["severity"] in ["high", "critical"]
    assert res["anomaly_score"] > 50


def test_deviation_rule():
    # z_score >= 1.5 AND deviation_pct >= 40% triggers anomaly
    baseline_mean = 50.0
    baseline_std = 12.0
    # Reading of 72.0: dev = (72-50)/50 = 44%, z = 22/12 = 1.83
    res = evaluate_reading_anomaly(current_pm25=72.0, baseline_mean=baseline_mean, baseline_std=baseline_std)
    assert res["is_anomaly"]
    assert res["severity"] == "moderate"
