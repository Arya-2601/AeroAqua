"""
Synthetic Data Generator for AeroAqua
Generates 30 days of hourly air quality, weather, traffic, roads, and events data
across the three configured functional demonstration regions:
1. Delhi
2. Maharashtra
3. Gujarat
Fixed random seed (42) for exact reproducibility.
"""

import json
import math
import os
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

# Setup directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CONFIG_PATH = os.path.join(BASE_DIR, "data", "config.json")
RAW_DATA_DIR = os.path.join(BASE_DIR, "data", "raw")
os.makedirs(RAW_DATA_DIR, exist_ok=True)


def load_config():
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate haversine distance in km between two lat/lon points."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    )
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def generate_all_data(end_dt=None):
    np.random.seed(42)
    config = load_config()
    stations = config["stations"]

    if end_dt is None:
        end_dt = datetime.now().replace(minute=0, second=0, microsecond=0)
    start_dt = end_dt - timedelta(hours=719)  # 720 hours total (30 days)

    timestamps = [start_dt + timedelta(hours=i) for i in range(720)]

    # 1. Stations & Roads DataFrame
    stations_data = []
    roads_data = []
    road_id_counter = 1

    road_types_pool = ["highway", "major", "minor"]
    road_names_pool = [
        "Ring Road Arterial", "Grand Trunk Highway", "Mathura Road Express",
        "Barapullah Elevated Corridor", "Western Express Highway", "Eastern Freeway Arterial",
        "Pune-Bangalore Highway Link", "Ahmedabad SG Highway", "Surat Ring Road Corridor",
        "Nehru Road Sector 4", "Vikas Marg Bypass", "Outer Ring Expressway"
    ]

    for s in stations:
        stations_data.append({
            "id": s["id"],
            "name": s["name"],
            "region": s.get("region", "Delhi"),
            "data_source": s.get("data_source", "Regional Monitoring Data"),
            "latitude": s["latitude"],
            "longitude": s["longitude"],
            "zone_profile": s["zone_profile"],
            "major_road_count_2km": s["major_road_count_2km"],
            "distance_to_highway_m": s["distance_to_highway_m"],
            "distance_to_major_road_m": s["distance_to_major_road_m"],
            "road_density": s["road_density"],
            "industrial_distance_km": s["industrial_distance_km"],
        })

        # Add roads for this station
        num_roads = max(1, s["major_road_count_2km"] + 1)
        for r_idx in range(num_roads):
            rtype = "highway" if r_idx == 0 and s["distance_to_highway_m"] < 1000 else (
                "major" if r_idx < s["major_road_count_2km"] else "minor"
            )
            dist = s["distance_to_highway_m"] if rtype == "highway" else (
                s["distance_to_major_road_m"] if rtype == "major" else s["distance_to_major_road_m"] * 2 + 300
            )
            roads_data.append({
                "road_id": road_id_counter,
                "station_id": s["id"],
                "road_name": road_names_pool[(road_id_counter - 1) % len(road_names_pool)],
                "road_type": rtype,
                "distance_m": dist,
            })
            road_id_counter += 1

    df_stations = pd.DataFrame(stations_data)
    df_roads = pd.DataFrame(roads_data)

    # 2. Events Data across Delhi, Maharashtra, and Gujarat
    events_data = [
        # --- DELHI EVENTS ---
        {
            "event_id": 1,
            "event_name": "City Stadium Championship Match",
            "event_type": "sports",
            "region": "Delhi",
            "latitude": 28.6259,
            "longitude": 77.2190,
            "start_time": (end_dt - timedelta(hours=2)).isoformat(),
            "end_time": (end_dt + timedelta(hours=2)).isoformat(),
            "expected_crowd": 45000,
            "affected_radius_km": 3.0,
            "description": "National Championship Football Match at Central Stadium venue"
        },
        {
            "event_id": 2,
            "event_name": "Delhi Tech & Music Open Air Fest",
            "event_type": "concert",
            "region": "Delhi",
            "latitude": 28.7415,
            "longitude": 77.0615,
            "start_time": (end_dt + timedelta(hours=3)).isoformat(),
            "end_time": (end_dt + timedelta(hours=8)).isoformat(),
            "expected_crowd": 18000,
            "affected_radius_km": 2.5,
            "description": "Annual Open Air Musical Festival & Student Gathering"
        },
        {
            "event_id": 3,
            "event_name": "Cultural Heritage Carnival",
            "event_type": "festival",
            "region": "Delhi",
            "latitude": 28.6200,
            "longitude": 77.2150,
            "start_time": (end_dt - timedelta(days=25, hours=4)).isoformat(),
            "end_time": (end_dt - timedelta(days=25, hours=-4)).isoformat(),
            "expected_crowd": 25000,
            "affected_radius_km": 2.5,
            "description": "Historical handicraft and food carnival"
        },
        {
            "event_id": 4,
            "event_name": "Metro Viaduct Construction Blitz",
            "event_type": "construction",
            "region": "Delhi",
            "latitude": 28.6650,
            "longitude": 77.2250,
            "start_time": (end_dt - timedelta(days=22, hours=12)).isoformat(),
            "end_time": (end_dt - timedelta(days=20, hours=0)).isoformat(),
            "expected_crowd": 500,
            "affected_radius_km": 1.5,
            "description": "Metro expansion corridor structural work"
        },

        # --- MAHARASHTRA EVENTS ---
        {
            "event_id": 5,
            "event_name": "Pune Cultural & Heritage Mahotsav",
            "event_type": "festival",
            "region": "Maharashtra",
            "latitude": 18.5254,
            "longitude": 73.8617,
            "start_time": (end_dt - timedelta(hours=2)).isoformat(),
            "end_time": (end_dt + timedelta(hours=2)).isoformat(),
            "expected_crowd": 35000,
            "affected_radius_km": 3.0,
            "description": "Grand cultural festival in central Pune with elevated vehicular congestion"
        },
        {
            "event_id": 6,
            "event_name": "Bandra-Kurla Global Trade Expo",
            "event_type": "gathering",
            "region": "Maharashtra",
            "latitude": 19.0650,
            "longitude": 72.8680,
            "start_time": (end_dt + timedelta(hours=3)).isoformat(),
            "end_time": (end_dt + timedelta(hours=8)).isoformat(),
            "expected_crowd": 28000,
            "affected_radius_km": 2.5,
            "description": "International Commerce & Finance Conclave at BKC Complex"
        },
        {
            "event_id": 7,
            "event_name": "Nagpur Agro & Citrus Innovation Summit",
            "event_type": "gathering",
            "region": "Maharashtra",
            "latitude": 21.1400,
            "longitude": 79.0800,
            "start_time": (end_dt - timedelta(days=5, hours=8)).isoformat(),
            "end_time": (end_dt - timedelta(days=4, hours=18)).isoformat(),
            "expected_crowd": 15000,
            "affected_radius_km": 2.0,
            "description": "Central Indian agricultural equipment and logistics expo"
        },
        {
            "event_id": 8,
            "event_name": "Navi Mumbai Coastal Highway Resurfacing",
            "event_type": "road_closure",
            "region": "Maharashtra",
            "latitude": 19.0300,
            "longitude": 73.0250,
            "start_time": (end_dt - timedelta(days=12, hours=6)).isoformat(),
            "end_time": (end_dt - timedelta(days=12, hours=0)).isoformat(),
            "expected_crowd": 300,
            "affected_radius_km": 1.2,
            "description": "Scheduled arterial road maintenance and lane diversion"
        },

        # --- GUJARAT EVENTS ---
        {
            "event_id": 9,
            "event_name": "Ahmedabad International Kite & Heritage Fest",
            "event_type": "festival",
            "region": "Gujarat",
            "latitude": 23.0300,
            "longitude": 72.5800,
            "start_time": (end_dt - timedelta(hours=2)).isoformat(),
            "end_time": (end_dt + timedelta(hours=2)).isoformat(),
            "expected_crowd": 40000,
            "affected_radius_km": 3.5,
            "description": "Sabarmati Riverfront major public gathering and celebration"
        },
        {
            "event_id": 10,
            "event_name": "Surat Diamond & Textile Trade Conclave",
            "event_type": "gathering",
            "region": "Gujarat",
            "latitude": 21.1750,
            "longitude": 72.8350,
            "start_time": (end_dt + timedelta(hours=4)).isoformat(),
            "end_time": (end_dt + timedelta(hours=9)).isoformat(),
            "expected_crowd": 22000,
            "affected_radius_km": 2.5,
            "description": "Global gemstone trade exchange and industrial conference"
        },
        {
            "event_id": 11,
            "event_name": "Gandhinagar Clean Tech & Solar Conclave",
            "event_type": "gathering",
            "region": "Gujarat",
            "latitude": 23.2200,
            "longitude": 72.6400,
            "start_time": (end_dt - timedelta(days=10, hours=4)).isoformat(),
            "end_time": (end_dt - timedelta(days=9, hours=20)).isoformat(),
            "expected_crowd": 12000,
            "affected_radius_km": 2.0,
            "description": "State renewable energy exhibition at Mahatma Mandir"
        },
        {
            "event_id": 12,
            "event_name": "Vadodara Petrochemical Safety Drill",
            "event_type": "gathering",
            "region": "Gujarat",
            "latitude": 22.3050,
            "longitude": 73.1850,
            "start_time": (end_dt - timedelta(days=2, hours=4)).isoformat(),
            "end_time": (end_dt - timedelta(days=2, hours=1)).isoformat(),
            "expected_crowd": 4000,
            "affected_radius_km": 1.5,
            "description": "Industrial zone emergency response drill"
        }
    ]
    df_events = pd.DataFrame(events_data)

    # 3. Weather, Traffic, Air Quality Data
    weather_rows = []
    traffic_rows = []
    air_quality_rows = []

    parsed_events = []
    for ev in events_data:
        parsed_events.append({
            "name": ev["event_name"],
            "region": ev["region"],
            "lat": ev["latitude"],
            "lon": ev["longitude"],
            "start": datetime.fromisoformat(ev["start_time"]),
            "end": datetime.fromisoformat(ev["end_time"]),
            "radius": ev["affected_radius_km"],
            "crowd": ev["expected_crowd"],
        })

    # Last 3 hours timestamps
    spike_hours = [timestamps[-3], timestamps[-2], timestamps[-1]]

    for t_idx, ts in enumerate(timestamps):
        hour = ts.hour
        weekday = ts.weekday()
        is_weekend = weekday >= 5

        # Base daily temperature cycle
        temp_cycle = 26.5 + 6.5 * math.sin((hour - 8.5) / 24.0 * 2.0 * math.pi)
        humidity_cycle = 62.5 - 17.5 * math.sin((hour - 8.5) / 24.0 * 2.0 * math.pi)
        base_wind_speed = 2.8 + 1.0 * math.sin((hour - 12.0) / 24.0 * 2.0 * math.pi)
        base_wind_dir = (280.0 + 35.0 * math.sin(t_idx / 24.0 * math.pi)) % 360.0

        is_rain_hour = (180 <= t_idx <= 186) or (450 <= t_idx <= 453)
        rain_amount = np.random.uniform(2.5, 8.0) if is_rain_hour else 0.0

        for s in stations:
            s_id = s["id"]
            base_pm25 = s["baseline_pm25"]

            # Anomaly stations on demo start:
            # - Station 2 (Rohini, Delhi)
            # - Station 9 (Pune, Maharashtra)
            # - Station 12 (Surat, Gujarat)
            is_anomaly_station = s_id in [2, 9, 12]

            if ts in spike_hours and is_anomaly_station:
                wind_speed = round(float(np.random.uniform(1.0, 1.3)), 1)
                wind_dir = 215.0  # Wind blowing towards station from local activity
            else:
                s_wind_noise = np.random.normal(0, 0.25)
                wind_speed = round(max(0.6, base_wind_speed + s_wind_noise), 1)
                wind_dir = round((base_wind_dir + np.random.normal(0, 10)) % 360.0, 1)

            temp = round(temp_cycle + np.random.normal(0, 0.6), 1)
            humidity = round(np.clip(humidity_cycle + np.random.normal(0, 1.8), 25, 95), 1)
            station_rainfall = round(rain_amount if rain_amount > 0 else 0.0, 1)

            weather_rows.append({
                "station_id": s_id,
                "timestamp": ts.isoformat(),
                "temperature": temp,
                "humidity": humidity,
                "wind_speed": wind_speed,
                "wind_direction": wind_dir,
                "rainfall": station_rainfall,
            })

            # Traffic Index
            if 8 <= hour <= 10:
                rush_factor = 1.6
            elif 18 <= hour <= 21:
                rush_factor = 1.7
            elif 11 <= hour <= 17:
                rush_factor = 1.15
            elif 0 <= hour <= 5:
                rush_factor = 0.35
            else:
                rush_factor = 0.8

            traffic_base = 35 + 25 * s["road_density"]
            traffic_val = traffic_base * rush_factor + np.random.normal(0, 4.0)

            event_boost = 0.0
            for pev in parsed_events:
                if pev["region"] == s.get("region", "Delhi") and pev["start"] <= ts <= pev["end"]:
                    dist = haversine_distance(s["latitude"], s["longitude"], pev["lat"], pev["lon"])
                    if dist <= pev["radius"]:
                        proximity_weight = max(0.0, 1.0 - (dist / pev["radius"]))
                        event_boost += (pev["crowd"] / 45000.0) * 25.0 * proximity_weight

            traffic_val += event_boost

            if ts in spike_hours and is_anomaly_station:
                traffic_val = float(np.random.uniform(78.0, 85.0))

            traffic_val = int(round(np.clip(traffic_val, 5, 98)))
            traffic_rows.append({
                "station_id": s_id,
                "timestamp": ts.isoformat(),
                "traffic_index": traffic_val,
            })

            # Air Quality
            if 8 <= hour <= 10:
                daily_pattern = 1.25
            elif 18 <= hour <= 21:
                daily_pattern = 1.35
            elif 3 <= hour <= 5:
                daily_pattern = 0.70
            elif 12 <= hour <= 16:
                daily_pattern = 0.90
            else:
                daily_pattern = 1.00

            weekly_pattern = 0.90 if is_weekend else 1.00

            if wind_speed < 1.8:
                weather_effect = 1.20
            elif wind_speed > 4.0:
                weather_effect = 0.85
            else:
                weather_effect = 1.00

            if station_rainfall > 1.0:
                weather_effect *= 0.65

            noise = np.random.normal(0, 0.05 * base_pm25)
            pm25 = base_pm25 * daily_pattern * weekly_pattern * weather_effect + noise

            # Initial anomaly elevation on demo start:
            if ts in spike_hours and is_anomaly_station:
                spike_multiplier = float(np.random.uniform(1.68, 1.74))  # ~ +70%
                pm25 = (base_pm25 * daily_pattern * weekly_pattern) * spike_multiplier + np.random.normal(0, 2.0)
            elif ts in spike_hours and s_id in [3, 8, 13]:
                # Milder non-anomalous elevation (+10%)
                pm25 = pm25 * 1.10

            pm25 = round(max(5.0, pm25), 1)
            pm10 = round(pm25 * float(np.random.uniform(1.65, 1.95)), 1)
            no2 = round(max(5.0, traffic_val * 0.75 + np.random.normal(0, 3.0)), 1)
            ind_factor = max(0.5, 10.0 / (s["industrial_distance_km"] + 1.0))
            so2 = round(max(3.0, ind_factor * 3.5 + np.random.normal(0, 2.0)), 1)
            o3_base = 45.0 if 11 <= hour <= 16 else 18.0
            o3 = round(max(4.0, o3_base + np.random.normal(0, 4.0)), 1)

            air_quality_rows.append({
                "station_id": s_id,
                "timestamp": ts.isoformat(),
                "pm25": pm25,
                "pm10": pm10,
                "no2": no2,
                "so2": so2,
                "o3": o3,
            })

    df_weather = pd.DataFrame(weather_rows)
    df_traffic = pd.DataFrame(traffic_rows)
    df_aq = pd.DataFrame(air_quality_rows)

    # Save to data/raw/
    df_stations.to_csv(os.path.join(RAW_DATA_DIR, "stations.csv"), index=False)
    df_roads.to_csv(os.path.join(RAW_DATA_DIR, "roads.csv"), index=False)
    df_events.to_csv(os.path.join(RAW_DATA_DIR, "events.csv"), index=False)
    df_weather.to_csv(os.path.join(RAW_DATA_DIR, "weather.csv"), index=False)
    df_traffic.to_csv(os.path.join(RAW_DATA_DIR, "traffic.csv"), index=False)
    df_aq.to_csv(os.path.join(RAW_DATA_DIR, "air_quality.csv"), index=False)

    print("Data generation complete!")
    print(f"Generated {len(df_stations)} stations across 3 regions:")
    for reg, grp in df_stations.groupby("region"):
        print(f"  - {reg}: {len(grp)} zones ({', '.join(grp['name'].tolist())})")
    print(f"Generated {len(df_events)} events across regions.")
    print(f"Total air quality records: {len(df_aq)}")


if __name__ == "__main__":
    generate_all_data()
