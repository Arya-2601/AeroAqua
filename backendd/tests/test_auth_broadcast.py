import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import Alert, Event, User

client = TestClient(app)


def test_auth_login_citizen():
    payload = {
        "username": "citizen",
        "password": "citizen123",
        "role": "citizen",
        "region": "Delhi"
    }
    resp = client.post("/api/auth/login", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["user"]["role"] == "citizen"
    assert data["user"]["region"] == "Delhi"
    assert "token" in data


def test_auth_login_authority():
    payload = {
        "username": "authority",
        "password": "admin123",
        "role": "authority",
        "region": "Delhi"
    }
    resp = client.post("/api/auth/login", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["user"]["role"] == "authority"


def test_authority_broadcast_flow():
    # 1. Trigger demo anomaly
    spike_payload = {"station_id": 2, "magnitude_pct": 70.0}
    spike_resp = client.post("/api/simulate/spike", json=spike_payload)
    assert spike_resp.status_code == 200
    spike_data = spike_resp.json()
    assert spike_data["is_demo_simulation"] is True
    assert spike_data["alert"] is not None

    alert_id = spike_data["alert"]["id"]

    # 2. Check that alert is not yet broadcast to citizens
    c_broadcasts = client.get("/api/alerts/broadcasts?region=Delhi").json()
    broadcast_ids = [b["id"] for b in c_broadcasts]
    assert alert_id not in broadcast_ids

    # 3. Authority clicks "Broadcast Alert"
    b_resp = client.post(f"/api/alerts/{alert_id}/broadcast")
    assert b_resp.status_code == 200
    assert b_resp.json()["broadcast_status"] in ["BROADCAST", "BROADCASTED"]

    # 4. Citizen now sees the broadcast alert
    c_broadcasts_after = client.get("/api/alerts/broadcasts?region=Delhi").json()
    broadcast_ids_after = [b["id"] for b in c_broadcasts_after]
    assert alert_id in broadcast_ids_after

    # 5. Authority clicks "Stop Broadcast"
    stop_resp = client.post(f"/api/alerts/{alert_id}/stop-broadcast")
    assert stop_resp.status_code == 200
    assert stop_resp.json()["broadcast_status"] in ["STOPPED", "BROADCAST_STOPPED"]

    # 6. Citizen no longer sees the active broadcast
    c_broadcasts_stopped = client.get("/api/alerts/broadcasts?region=Delhi").json()
    broadcast_ids_stopped = [b["id"] for b in c_broadcasts_stopped]
    assert alert_id not in broadcast_ids_stopped

    # 7. Historical alert record remains in database
    history_resp = client.get("/api/alerts?active=true").json()
    hist_ids = [h["id"] for h in history_resp]
    assert alert_id in hist_ids


def test_authority_event_crud():
    # 1. Add Event
    new_event = {
        "event_name": "Delhi Green Marathon",
        "event_type": "sports",
        "latitude": 28.6150,
        "longitude": 77.2100,
        "start_time": "2026-10-01T06:00:00",
        "end_time": "2026-10-01T11:00:00",
        "expected_crowd": 15000,
        "affected_radius_km": 3.0
    }
    create_res = client.post("/api/events", json=new_event)
    assert create_res.status_code == 200
    ev = create_res.json()
    ev_id = ev["id"]
    assert ev["event_name"] == "Delhi Green Marathon"

    # 2. Edit Event
    update_data = {
        "event_name": "Delhi Green Marathon - Rescheduled",
        "event_type": "sports",
        "latitude": 28.6150,
        "longitude": 77.2100,
        "start_time": "2026-10-01T07:00:00",
        "end_time": "2026-10-01T12:00:00",
        "expected_crowd": 20000,
        "affected_radius_km": 3.5
    }
    update_res = client.put(f"/api/events/{ev_id}", json=update_data)
    assert update_res.status_code == 200
    assert update_res.json()["event_name"] == "Delhi Green Marathon - Rescheduled"

    # 3. Cancel Event
    del_res = client.delete(f"/api/events/{ev_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "ok"
