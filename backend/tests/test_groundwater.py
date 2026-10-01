import pytest
from app.database import SessionLocal
from app.services.groundwater_service import (
    get_available_states,
    get_state_groundwater_summary,
    get_state_groundwater_trends,
    calculate_parameter_baseline
)


def test_baseline_calculation():
    vals = [7.2, 7.5, 7.4, 7.8, 7.1]
    mean_val, std_val = calculate_parameter_baseline(vals)
    assert 7.0 <= mean_val <= 8.0
    assert std_val > 0


def test_groundwater_states():
    db = SessionLocal()
    try:
        states = get_available_states(db)
        assert len(states) >= 30
        state_names = [s["state"] for s in states]
        assert "DELHI" in state_names
        assert "MAHARASHTRA" in state_names
    finally:
        db.close()


def test_delhi_groundwater_summary():
    db = SessionLocal()
    try:
        summary = get_state_groundwater_summary(db, "DELHI")
        assert summary["state"] == "DELHI"
        assert "Historical Groundwater Quality" in summary["dataset_label"]
        assert "Kaggle" in summary["source"]
        assert len(summary["parameters"]) >= 2
        # Verify pH and conductivity parameters exist
        param_keys = [p["key"] for p in summary["parameters"]]
        assert "ph" in param_keys
        assert "conductivity" in param_keys
        # Check risk level is valid
        assert summary["groundwater_risk_level"] in ["LOW", "MODERATE", "HIGH", "NORMAL", "WATCH", "WARNING", "CRITICAL"]
    finally:
        db.close()


def test_groundwater_trends():
    db = SessionLocal()
    try:
        trends = get_state_groundwater_trends(db, "DELHI", "ph")
        assert len(trends) > 0
        for point in trends:
            assert "year" in point
            assert "mean" in point
            assert point["mean"] > 0
    finally:
        db.close()
