import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_api_stations_list():
    response = client.get("/api/stations")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 6

    # Verify fields in each station
    for s in data:
        assert "id" in s
        assert "name" in s
        assert "current_pm25" in s
        assert "category" in s
        assert "color" in s
        assert "risk_level" in s
        assert "is_anomaly" in s

    # Zone B (id=2) should have an anomaly on demo start
    zone_b = next((s for s in data if s["id"] == 2), None)
    assert zone_b is not None
    assert zone_b["is_anomaly"] is True


def test_api_station_detail():
    response = client.get("/api/stations/2")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 2
    assert data["name"] == "Zone B"
    assert "road_density" in data
    assert "distance_to_highway_m" in data
    assert "latest_weather" in data


def test_api_station_readings():
    response = client.get("/api/stations/2/readings?hours=24")
    assert response.status_code == 200
    data = response.json()
    assert data["station_id"] == 2
    assert "readings" in data
    assert len(data["readings"]) > 0
    first = data["readings"][0]
    assert "pm25" in first
    assert "baseline_mean" in first
    assert "baseline_upper" in first


def test_api_station_context():
    response = client.get("/api/stations/2/context")
    assert response.status_code == 200
    data = response.json()
    assert data["station_id"] == 2
    assert "factors" in data
    assert isinstance(data["factors"], list)
    assert "disclaimer" in data
    assert "not confirmed causes" in data["disclaimer"]


def test_api_station_forecast():
    response = client.get("/api/stations/2/forecast")
    assert response.status_code == 200
    data = response.json()
    assert data["station_id"] == 2
    assert "current" in data
    assert "forecast" in data
    assert len(data["forecast"]) == 3
    horizons = [f["horizon_hours"] for f in data["forecast"]]
    assert horizons == [1, 3, 6]
    for h in data["forecast"]:
        assert "pm25" in h
        assert "category" in h
        assert "color" in h
        assert "range" in h
        assert len(h["range"]) == 2


def test_api_simulate_spike():
    # Simulate a spike on Zone A (station 1)
    payload = {"station_id": 1, "magnitude_pct": 75.0}
    response = client.post("/api/simulate/spike", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["station_id"] == 1
    assert data["anomaly"]["is_anomaly"] is True

    # Verify that station 1 is now marked as an anomaly in the list
    list_res = client.get("/api/stations")
    zone_a = next(s for s in list_res.json() if s["id"] == 1)
    assert zone_a["is_anomaly"] is True

    # Reset back to pristine demo dataset
    reset_res = client.post("/api/simulate/reset")
    assert reset_res.status_code == 200
