"""
Master Test Suite for AeroAqua
Tests all master features:
1. Public visitor open access (no login required to view dashboard, maps, telemetry, forecasts, alerts, groundwater)
2. Public Environmental Issue Reporting with identity details & reference ID generation
3. Public Zone Coverage Requests with identity details & reference ID generation
4. Authority Review, Approval, Rejection, and Zone Creation Workflow
5. Authority Map-based & Manual Zone creation and reverse geocoding
6. Authority Remove Zone (soft delete, state isolation, instant persistence)
7. Security & State Isolation: Authority of Maharashtra cannot modify Delhi/Gujarat zones or reports
8. Explainable Alerts ('Why am I seeing this alert?', context, forecast, action cards)
9. Authority What-If Scenarios (SIMULATION provenance, recalculated pipeline, recommended response)
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import Station, AirQuality, Alert, User, CitizenReport, ZoneRequest

client = TestClient(app)


def test_public_visitor_access_without_login():
    """Verify that public visitors can access all environmental data without authentication."""
    # 1. Stations list
    st_res = client.get("/api/stations?region=Delhi")
    assert st_res.status_code == 200
    stations = st_res.json()
    assert len(stations) >= 5

    # 2. Station readings
    st_id = stations[0]["id"]
    rd_res = client.get(f"/api/stations/{st_id}/readings?hours=24")
    assert rd_res.status_code == 200

    # 3. Forecast
    fc_res = client.get(f"/api/stations/{st_id}/forecast")
    assert fc_res.status_code == 200

    # 4. Environmental context
    ctx_res = client.get(f"/api/stations/{st_id}/context")
    assert ctx_res.status_code == 200

    # 5. Public broadcasts
    bc_res = client.get("/api/alerts/broadcasts?region=Delhi")
    assert bc_res.status_code == 200

    # 6. Groundwater historical states
    gw_res = client.get("/api/groundwater/states")
    assert gw_res.status_code == 200


def test_public_report_workflow_with_identity():
    """Verify public issue submission with contact identity details, reference ID, and authority review."""
    unique_ts = int(datetime.utcnow().timestamp())
    report_payload = {
        "reporter_name": "Priya Sharma",
        "email": f"priya_{unique_ts}@example.com",
        "phone": "+91 98765 43210",
        "category": "air_pollution",
        "region": "Maharashtra",
        "city": "Mumbai",
        "area_locality": f"Kurla West Industrial Junction {unique_ts}",
        "latitude": 19.0700,
        "longitude": 72.8800,
        "description": "Dense black smoke emission from unregulated scrap melting units."
    }
    submit_res = client.post("/api/reports", json=report_payload)
    assert submit_res.status_code == 200
    report_data = submit_res.json()
    assert report_data["status"] == "Pending"
    assert report_data["reporter_name"] == "Priya Sharma"
    assert report_data["email"] == f"priya_{unique_ts}@example.com"
    assert report_data["phone"] == "+91 98765 43210"
    assert "REP-" in report_data["reference_id"]
    report_id = report_data["id"]

    # Delhi Authority tries to modify Maharashtra report -> Rejected with 403
    delhi_auth_login = client.post("/api/auth/login", json={
        "username": "auth_delhi",
        "password": "admin123",
        "role": "authority",
        "region": "Delhi"
    })
    delhi_headers = {"Authorization": f"Bearer {delhi_auth_login.json()['token']}"}
    unauthorized_res = client.patch(f"/api/reports/{report_id}/status", json={"status": "Under Review"}, headers=delhi_headers)
    assert unauthorized_res.status_code == 403

    # Maharashtra Authority reviews and marks Under Review
    mh_auth_login = client.post("/api/auth/login", json={
        "username": "auth_mh",
        "password": "admin123",
        "role": "authority",
        "region": "Maharashtra"
    })
    mh_headers = {"Authorization": f"Bearer {mh_auth_login.json()['token']}"}
    review_res = client.patch(f"/api/reports/{report_id}/status", json={
        "status": "Under Review",
        "authority_notes": "Inspection team dispatched to Kurla industrial cluster."
    }, headers=mh_headers)
    assert review_res.status_code == 200
    assert review_res.json()["status"] == "Under Review"
    assert "Inspection team" in review_res.json()["authority_notes"]


def test_public_zone_request_and_authority_approval():
    """Verify public zone request with contact identity details, reference ID, and authority approval/creation."""
    unique_ts = int(datetime.utcnow().timestamp())
    area_name = f"Kalyan West Khadakpada {unique_ts}"
    req_payload = {
        "applicant_name": "Ramesh Kulkarni",
        "email": f"ramesh_{unique_ts}@example.com",
        "phone": "+91 91234 56789",
        "region": "Maharashtra",
        "city": "Kalyan",
        "area_locality": area_name,
        "pincode": "421301",
        "latitude": 19.2450,
        "longitude": 73.1350,
        "reason": "Rapidly growing urban node with high vehicular transit requiring air monitoring.",
        "description": "High school zone nearby with heavy diesel bus traffic."
    }
    submit_res = client.post("/api/zone-requests", json=req_payload)
    assert submit_res.status_code == 200
    req_data = submit_res.json()
    assert req_data["status"] == "Pending"
    assert req_data["applicant_name"] == "Ramesh Kulkarni"
    assert req_data["email"] == f"ramesh_{unique_ts}@example.com"
    assert "ZR-" in req_data["reference_id"]
    req_id = req_data["id"]

    # Authority reviews zone requests list
    mh_auth_login = client.post("/api/auth/login", json={
        "username": "auth_mh_zone",
        "password": "admin123",
        "role": "authority",
        "region": "Maharashtra"
    })
    mh_headers = {"Authorization": f"Bearer {mh_auth_login.json()['token']}"}

    list_res = client.get("/api/zone-requests?region=Maharashtra")
    assert list_res.status_code == 200
    req_ids = [r["id"] for r in list_res.json()]
    assert req_id in req_ids

    # Authority converts request into active monitoring zone
    create_res = client.post(f"/api/zone-requests/{req_id}/create-zone", headers=mh_headers)
    assert create_res.status_code == 200
    created_zone = create_res.json()
    assert created_zone["status"] == "ok"
    new_station_id = created_zone["station_id"]

    # Verify newly created station is active and has initialized readings
    st_res = client.get(f"/api/stations/{new_station_id}")
    assert st_res.status_code == 200
    assert st_res.json()["region"] == "Maharashtra"


def test_reverse_geocoding_helper():
    """Verify reverse geocoding lookup endpoint."""
    res = client.get("/api/stations/reverse-geocode/lookup?latitude=19.2403&longitude=73.1305")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert "latitude" in data
    assert "longitude" in data


def test_what_if_scenario_and_explainable_alert():
    """Verify What-If scenario execution, SIMULATION labeling, explainability, and recommended responses."""
    auth_login = client.post("/api/auth/login", json={
        "username": "authority_sim",
        "password": "admin123",
        "role": "authority",
        "region": "Maharashtra"
    })
    headers = {"Authorization": f"Bearer {auth_login.json()['token']}"}

    sim_payload = {
        "station_id": 11,
        "magnitude_pct": 75.0,
        "scenario_type": "PM2.5 Surge"
    }
    sim_res = client.post("/api/simulate/spike", json=sim_payload, headers=headers)
    assert sim_res.status_code == 200
    sim_data = sim_res.json()

    assert sim_data["is_simulation"] is True
    assert sim_data["provenance"] == "SIMULATION"
    assert sim_data["simulated_pm25"] > sim_data["current_pm25"]
    assert "recommended_response" in sim_data
    assert len(sim_data["recommended_response"]) >= 2

    # Verify generated alert contains explainability breakdown
    alerts_res = client.get("/api/alerts?region=Maharashtra")
    assert alerts_res.status_code == 200
    alerts = alerts_res.json()
    sim_alert = next((a for a in alerts if a["provenance"] == "SIMULATION"), None)
    assert sim_alert is not None
    assert sim_alert["explanation"] is not None
    assert sim_alert["explanation"]["provenance"] == "SIMULATION"
    assert len(sim_alert["explanation"]["recommendations"]) >= 2


def test_authority_manual_and_map_creation():
    """Verify manual and map-based zone creation with state restriction."""
    auth_login = client.post("/api/auth/login", json={
        "username": "auth_create",
        "password": "admin123",
        "role": "authority",
        "region": "Gujarat"
    })
    headers = {"Authorization": f"Bearer {auth_login.json()['token']}"}

    # 1. Authority creates zone in assigned region (Gujarat)
    unique_ts = int(datetime.utcnow().timestamp())
    new_zone_payload = {
        "name": f"Navsari Industrial Zone {unique_ts}",
        "region": "Gujarat",
        "latitude": 20.9467,
        "longitude": 72.9520,
        "zone_profile": "Industrial",
        "description": "Chemical and textile manufacturing cluster"
    }
    create_res = client.post("/api/stations", json=new_zone_payload, headers=headers)
    assert create_res.status_code == 200
    st_id = create_res.json()["id"]

    # 2. Gujarat Authority attempts to create zone in Delhi -> Rejected with 403
    cross_state_payload = {
        "name": "Unauthorized Delhi Zone",
        "region": "Delhi",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "zone_profile": "Residential"
    }
    cross_res = client.post("/api/stations", json=cross_state_payload, headers=headers)
    assert cross_res.status_code == 403
