import httpx
import certifi

api_key = "24c9b0b213941e7a23884698584a94d438df4cab7ec480d1384857b1d0322bb3"
base_url = "https://api.openaq.org/v3"

headers = {
    "X-API-Key": api_key,
    "User-Agent": "AeroAqua/1.0"
}

with httpx.Client(verify=certifi.where(), timeout=15.0) as client:
    # Query locations around Delhi center (28.6139, 77.2090) with radius 25000m
    resp = client.get(
        f"{base_url}/locations",
        headers=headers,
        params={"coordinates": "28.6139,77.2090", "radius": 25000, "limit": 10}
    )
    print(f"Delhi Radius Search Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        results = data.get("results", [])
        print(f"Found {len(results)} locations near Delhi:")
        for loc in results:
            print(f"  * ID: {loc.get('id')}, Name: {loc.get('name')}, Sensors: {len(loc.get('sensors', []))}")
            for sensor in loc.get("sensors", [])[:4]:
                print(f"      - Sensor ID {sensor.get('id')}: {sensor.get('name')} parameter={sensor.get('parameter')}")
            # Check latest measurements
            loc_id = loc.get('id')
            meas_resp = client.get(f"{base_url}/locations/{loc_id}/latest", headers=headers)
            if meas_resp.status_code == 200:
                meas_data = meas_resp.json().get("results", [])
                print(f"      Latest measurements: {len(meas_data)}")
                for m in meas_data[:3]:
                    print(f"        -> {m.get('parameter', {}).get('name')}: {m.get('value')} {m.get('parameter', {}).get('units')}, datetime: {m.get('datetime', {}).get('utc')}")
            break
    else:
        print(resp.text)
