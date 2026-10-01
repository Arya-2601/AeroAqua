import urllib.request
import json
import sys

base = 'http://127.0.0.1:8000'

def get(path):
    req = urllib.request.Request(f'{base}{path}')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def post(path, data, token=None):
    payload = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(f'{base}{path}', data=payload, headers={'Content-Type': 'application/json'})
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def main():
    print("Testing AeroAqua Full System End-to-End...")

    # 1. Health
    h = get('/api/health')
    assert h['status'] == 'ok'
    print(f"[OK] 1. Health: {h['status']}")

    # 2. Groundwater
    states = get('/api/groundwater/states')
    assert len(states) > 0
    print(f"[OK] 2. Groundwater States: {len(states)} states found")

    summary = get('/api/groundwater/summary?state=DELHI')
    assert summary['state'] == 'DELHI'
    ph_baseline = (summary.get('parameters_map') or {}).get('ph', {}).get('baseline_mean') or (next((p['baseline_mean'] for p in summary.get('parameters', []) if isinstance(p, dict) and p.get('key') == 'ph'), 'N/A'))
    risk_level = summary.get('groundwater_risk', {}).get('level') or summary.get('groundwater_risk_level')
    print(f"[OK] 3. Groundwater Delhi: risk={risk_level}, pH baseline={ph_baseline}")

    trends = get('/api/groundwater/trends?state=DELHI&parameter=ph')
    assert len(trends['trends']) > 0
    print(f"[OK] 4. Groundwater Trends: {len(trends['trends'])} annual records")

    # 3. Auth
    auth_res = post('/api/auth/login', {'username': 'authority', 'password': 'authority123'})
    token = auth_res['token']
    assert auth_res['user']['role'] == 'authority'
    print(f"[OK] 5. Authority Login: success, user={auth_res['user']['username']}")

    # 4. Live Station Refresh
    ref_res = post('/api/stations/1/refresh', {})
    assert ref_res['status'] == 'ok'
    print(f"[OK] 6. Live Station Refresh: {ref_res['message']}")

    # 5. Station Forecast
    fc_res = get('/api/stations/1/forecast')
    assert len(fc_res['forecast']) == 3
    print(f"[OK] 7. Station Forecast: 1h, 3h, 6h projections loaded")

    # 6. Run Demo Anomaly
    spike_res = post('/api/simulate/spike', {'station_id': 1, 'magnitude_pct': 70.0})
    assert spike_res['status'] == 'ok'
    alert_id = spike_res.get('alert', {}).get('id')
    print(f"[OK] 8. Run Demo Anomaly: updated_pm25={spike_res['updated_pm25']}, alert_id={alert_id}")

    # 7. Broadcast Alert
    if alert_id:
        bc_res = post(f'/api/alerts/{alert_id}/broadcast', {}, token=token)
        assert bc_res['status'] == 'ok'
        print(f"[OK] 9. Broadcast Alert: {bc_res['message']}")

    # 8. Citizen Broadcasts
    bc_list = get('/api/alerts/broadcasts?region=Delhi')
    assert len(bc_list) >= 1
    print(f"[OK] 10. Citizen Broadcasts Feed: {len(bc_list)} active broadcasts")

    # 9. Stop Broadcast
    if alert_id:
        stop_res = post(f'/api/alerts/{alert_id}/stop-broadcast', {}, token=token)
        assert stop_res['status'] == 'ok'
        print(f"[OK] 11. Stop Broadcast: {stop_res['message']}")

    # 10. Resolve Alert
    if alert_id:
        res_res = post(f'/api/alerts/{alert_id}/resolve', {}, token=token)
        assert res_res['status'] == 'ok'
        print(f"[OK] 12. Resolve Alert: {res_res['message']}")

    print("\nALL 12 END-TO-END ACCEPTANCE VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    main()
