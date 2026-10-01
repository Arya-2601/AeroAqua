"""
Tests for Zone Removal, Security & Authorization, Timezone Handling,
Automatic Event Lifecycle, and State Isolation.
"""

import pytest
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import Station, AirQuality, Event, Alert, User

client = TestClient(app)
IST_TZ = ZoneInfo("Asia/Kolkata")


def test_citizen_authorization_rejections():
    """Verify that a citizen account is rejected (403 Forbidden) on all Authority-only actions."""
    # Login as citizen
    c_login = client.post("/api/auth/login", json={
        "username": "citizen",
        "password": "citizen123",
        "role": "citizen",
        "region": "Delhi"
    })
    assert c_login.status_code == 200
    c_token = c_login.json()["token"]
    c_headers = {"Authorization": f"Bearer {c_token}"}

    # 1. Citizen attempts to remove a zone
    del_zone = client.delete("/api/stations/1", headers=c_headers)
    assert del_zone.status_code == 403
    assert "Authority privileges required" in del_zone.json()["detail"]

    # 2. Citizen attempts to add a zone
    add_zone = client.post("/api/stations", json={
        "name": "Unauthorized Zone",
        "region": "Delhi",
        "latitude": 28.6,
        "longitude": 77.2
    }, headers=c_headers)
    assert add_zone.status_code == 403

    # 3. Citizen attempts to create an event
    add_event = client.post("/api/events", json={
        "event_name": "Unauthorized Marathon",
        "event_type": "sports",
        "region": "Delhi",
        "latitude": 28.6,
        "longitude": 77.2,
        "start_time": "2026-10-01T06:00:00+05:30",
        "end_time": "2026-10-01T10:00:00+05:30",
    }, headers=c_headers)
    assert add_event.status_code == 403

    # 4. Citizen attempts to broadcast an alert
    b_alert = client.post("/api/alerts/1/broadcast", headers=c_headers)
    assert b_alert.status_code == 403

    # 5. Citizen attempts to trigger demo spike
    spike = client.post("/api/simulate/spike", json={
        "station_id": 1,
        "magnitude_pct": 50.0
    }, headers=c_headers)
    assert spike.status_code == 403


def test_authority_zone_removal_and_cross_state_restriction():
    """Verify zone removal, cross-state restriction, and historical preservation."""
    db = SessionLocal()
    # Create a test station in Maharashtra
    test_station = Station(
        name="Temporary Pune Test Zone",
        region="Maharashtra",
        latitude=18.5204,
        longitude=73.8567,
        zone_profile="Commercial",
        is_active=True
    )
    db.add(test_station)
    db.commit()
    db.refresh(test_station)
    st_id = test_station.id

    # Add historical reading
    hist_aq = AirQuality(
        station_id=st_id,
        timestamp=datetime.now(),
        pm25=55.0
    )
    db.add(hist_aq)
    db.commit()
    db.close()

    # Login as Authority with Delhi region
    delhi_auth_login = client.post("/api/auth/login", json={
        "username": "delhi_authority",
        "password": "admin123",
        "role": "authority",
        "region": "Delhi"
    })
    delhi_token = delhi_auth_login.json()["token"]
    delhi_headers = {"Authorization": f"Bearer {delhi_token}"}

    # Attempt cross-state zone removal: Delhi authority trying to delete Maharashtra zone -> 403
    cross_res = client.delete(f"/api/stations/{st_id}", headers=delhi_headers)
    assert cross_res.status_code == 403
    assert "not permitted to remove monitoring zones in Maharashtra" in cross_res.json()["detail"]

    # Login as Authority with Maharashtra region
    mh_auth_login = client.post("/api/auth/login", json={
        "username": "mh_authority",
        "password": "admin123",
        "role": "authority",
        "region": "Maharashtra"
    })
    mh_token = mh_auth_login.json()["token"]
    mh_headers = {"Authorization": f"Bearer {mh_token}"}

    # Authorize deletion for same state
    del_res = client.delete(f"/api/stations/{st_id}", headers=mh_headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "ok"
    assert "removed successfully" in del_res.json()["message"]

    # Verify zone is removed from active monitoring stations
    stations_list = client.get("/api/stations?region=Maharashtra").json()
    active_ids = [s["id"] for s in stations_list]
    assert st_id not in active_ids

    # Verify historical records still exist in database (soft delete)
    db2 = SessionLocal()
    st_in_db = db2.query(Station).filter(Station.id == st_id).first()
    assert st_in_db is not None
    assert st_in_db.is_active is False
    readings = db2.query(AirQuality).filter(AirQuality.station_id == st_id).all()
    assert len(readings) >= 1
    db2.close()


def test_event_timezone_and_mumbai_marathon():
    """Verify exact IST timezone interpretation with the user's Mumbai Marathon example."""
    # Login as Authority
    auth_login = client.post("/api/auth/login", json={
        "username": "authority_mh",
        "password": "admin123",
        "role": "authority",
        "region": "Maharashtra"
    })
    auth_headers = {"Authorization": f"Bearer {auth_login.json()['token']}"}

    # Create Mumbai Marathon event on 1 October 2026 at 1:27 AM to 5:30 AM
    payload = {
        "event_name": "Mumbai Marathon",
        "event_type": "sports",
        "region": "Maharashtra",
        "zone_name": "Mumbai Central",
        "latitude": 18.9712,
        "longitude": 72.8222,
        "start_time": "2026-10-01T01:27:00+05:30",
        "end_time": "2026-10-01T05:30:00+05:30",
        "expected_crowd": 25000,
        "affected_radius_km": 4.0,
        "description": "Annual metropolitan marathon route"
    }

    create_res = client.post("/api/events", json=payload, headers=auth_headers)
    assert create_res.status_code == 200
    ev_data = create_res.json()
    ev_id = ev_data["id"]

    assert ev_data["event_name"] == "Mumbai Marathon"
    assert ev_data["region"] == "Maharashtra"
    assert ev_data["zone_name"] == "Mumbai Central"
    # Verify exact IST serialization
    assert "2026-10-01T01:27:00+05:30" in ev_data["start_time"]
    assert "2026-10-01T05:30:00+05:30" in ev_data["end_time"]

    # Verify query for Maharashtra returns it
    mh_events = client.get("/api/events?region=Maharashtra").json()
    mh_ids = [e["id"] for e in mh_events]
    assert ev_id in mh_ids
    found = next(e for e in mh_events if e["id"] == ev_id)
    assert "2026-10-01T01:27:00+05:30" in found["start_time"]
    assert "2026-10-01T05:30:00+05:30" in found["end_time"]

    # Verify state isolation: event must NOT appear in Delhi or Gujarat
    delhi_events = client.get("/api/events?region=Delhi").json()
    assert ev_id not in [e["id"] for e in delhi_events]

    gujarat_events = client.get("/api/events?region=Gujarat").json()
    assert ev_id not in [e["id"] for e in gujarat_events]


def test_automatic_event_lifecycle_transitions():
    """Verify that event lifecycle automatically computes UPCOMING, ACTIVE, and ENDED."""
    from app.services.datetime_service import compute_event_lifecycle, get_now_ist
    now_ist = get_now_ist()

    # 1. Before start time -> UPCOMING
    future_start = now_ist + timedelta(hours=2)
    future_end = now_ist + timedelta(hours=4)
    assert compute_event_lifecycle(future_start, future_end) == "UPCOMING"

    # 2. Between start and end -> ACTIVE
    past_start = now_ist - timedelta(hours=1)
    future_end2 = now_ist + timedelta(hours=1)
    assert compute_event_lifecycle(past_start, future_end2) == "ACTIVE"

    # 3. After end time -> ENDED
    past_start2 = now_ist - timedelta(hours=3)
    past_end2 = now_ist - timedelta(hours=1)
    assert compute_event_lifecycle(past_start2, past_end2) == "ENDED"

    # 4. Cancelled event -> CANCELLED
    assert compute_event_lifecycle(future_start, future_end, is_cancelled=True) == "CANCELLED"
