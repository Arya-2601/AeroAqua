"""
End-to-End Demo Flow Verification Script for AeroAqua
Verifies the exact Demo Flow from Section 14 against live servers.
"""

import json
import urllib.request

BASE_URL = "http://127.0.0.1:8000"


def http_get(path):
    with urllib.request.urlopen(f"{BASE_URL}{path}") as resp:
        return json.loads(resp.read().decode("utf-8"))


def http_post(path, data):
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=body,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def run_checks():
    print("=== AeroAqua End-to-End Demo Flow Verification ===")

    # 1. Health
    health = http_get("/api/health")
    assert health["status"] == "ok"
    print("[OK] 1. Backend Health Check OK: /api/health")

    # 2. Stations
    stations = http_get("/api/stations")
    assert len(stations) == 6
    zone_b = next(s for s in stations if s["id"] == 2)
    assert zone_b["is_anomaly"] is True
    print(f"[OK] 2. 6 Stations loaded. Zone B flagged as ANOMALY: PM2.5 = {zone_b['current_pm25']} ug/m3 ({zone_b['category']}), Risk = {zone_b['risk_level']}")

    # 3. Readings time series
    readings_resp = http_get("/api/stations/2/readings?hours=48")
    assert len(readings_resp["readings"]) > 0
    print(f"[OK] 3. 48-Hour Readings loaded: {len(readings_resp['readings'])} points with baseline band")

    # 4. Context Correlation
    context = http_get("/api/stations/2/context")
    assert len(context["factors"]) > 0
    assert "not confirmed causes" in context["disclaimer"]
    print(f"[OK] 4. Context Correlation loaded with {len(context['factors'])} factors:")
    for f in context["factors"][:3]:
        assert "caused by" not in f["text"].lower()
        print(f"     - [{f['type']}] {f['text']} (relevance: {f['relevance']})")
    print(f"     Disclaimer: {context['disclaimer']}")

    # 5. Forecast
    forecast = http_get("/api/stations/2/forecast")
    assert len(forecast["forecast"]) == 3
    print(f"[OK] 5. XGBoost Forecast (+1h, +3h, +6h) loaded in {forecast.get('inference_time_ms')} ms:")
    for h in forecast["forecast"]:
        print(f"     - +{h['horizon_hours']}h: {h['pm25']} ug/m3 ({h['category']}, range: {h['range']})")

    # 6. Active Alerts
    alerts = http_get("/api/alerts?active=true")
    assert len(alerts) > 0
    top_alert = alerts[0]
    print(f"[OK] 6. Early-Warning Alert active: [{top_alert['risk_level']}] {top_alert['title']}")
    print(f"     Message: {top_alert['message']}")

    # 7. Simulate Spike on Zone A
    print("\n--- Testing Live Simulation ---")
    spike_res = http_post("/api/simulate/spike", {"station_id": 1, "magnitude_pct": 75})
    assert spike_res["status"] == "ok"
    assert spike_res["anomaly"]["is_anomaly"] is True
    print(f"[OK] 7. Simulated +75% spike on Zone A: new PM2.5 = {spike_res['updated_pm25']} ug/m3, flagged as ANOMALY")

    # 8. Reset Demo
    reset_res = http_post("/api/simulate/reset", {})
    assert reset_res["status"] == "ok"
    print(f"[OK] 8. Reset demo completed: {reset_res['message']}")

    # Verify reset
    stations_after = http_get("/api/stations")
    zone_a_after = next(s for s in stations_after if s["id"] == 1)
    zone_b_after = next(s for s in stations_after if s["id"] == 2)
    assert zone_a_after["is_anomaly"] is False
    assert zone_b_after["is_anomaly"] is True
    print("[OK] 9. Post-reset verification: Zone A normal, Zone B anomaly restored.")

    print("\n=== All Verification Checks Passed 100% Successfully! ===")


if __name__ == "__main__":
    run_checks()
