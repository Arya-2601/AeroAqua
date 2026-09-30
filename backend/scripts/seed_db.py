"""
Database Seed Script for AeroAqua
Loads CSV data from data/raw/ into SQLite/PostgreSQL database.
Logs row counts upon completion.
"""

import os
import sys
from datetime import datetime
import pandas as pd

# Add backend directory to sys.path
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR = os.path.dirname(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)

from app.database import engine, Base, SessionLocal, init_db
from app.models import Station, Road, AirQuality, Weather, Traffic, Event, Anomaly, Alert

RAW_DATA_DIR = os.path.join(ROOT_DIR, "data", "raw")


def seed_database(reset=True):
    print("Initializing database tables...")
    init_db()

    session = SessionLocal()
    try:
        if reset:
            # Clear existing data in reverse order of foreign keys
            session.query(Alert).delete()
            session.query(Anomaly).delete()
            session.query(Traffic).delete()
            session.query(Weather).delete()
            session.query(AirQuality).delete()
            session.query(Road).delete()
            session.query(Event).delete()
            session.query(Station).delete()
            session.commit()
            print("Existing tables cleared.")

        # Check if CSV files exist; if not, generate them
        required_csvs = ["stations.csv", "roads.csv", "events.csv", "weather.csv", "traffic.csv", "air_quality.csv"]
        missing = [f for f in required_csvs if not os.path.exists(os.path.join(RAW_DATA_DIR, f))]
        if missing:
            print(f"Missing CSVs {missing}. Running generate_data.py...")
            from scripts.generate_data import generate_all_data
            generate_all_data()

        # 1. Seed Stations
        df_stations = pd.read_csv(os.path.join(RAW_DATA_DIR, "stations.csv"))
        stations_to_add = [
            Station(
                id=int(r["id"]),
                name=str(r["name"]),
                latitude=float(r["latitude"]),
                longitude=float(r["longitude"]),
                zone_profile=str(r["zone_profile"]),
                major_road_count_2km=int(r["major_road_count_2km"]),
                distance_to_highway_m=float(r["distance_to_highway_m"]),
                distance_to_major_road_m=float(r["distance_to_major_road_m"]),
                road_density=float(r["road_density"]),
                industrial_distance_km=float(r["industrial_distance_km"]),
            )
            for _, r in df_stations.iterrows()
        ]
        session.bulk_save_objects(stations_to_add)
        session.commit()
        print(f"Seeded {len(stations_to_add)} stations.")

        # 2. Seed Roads
        df_roads = pd.read_csv(os.path.join(RAW_DATA_DIR, "roads.csv"))
        roads_to_add = [
            Road(
                id=int(r["road_id"]),
                station_id=int(r["station_id"]),
                road_name=str(r["road_name"]),
                road_type=str(r["road_type"]),
                distance_m=float(r["distance_m"]),
            )
            for _, r in df_roads.iterrows()
        ]
        session.bulk_save_objects(roads_to_add)
        session.commit()
        print(f"Seeded {len(roads_to_add)} roads.")

        # 3. Seed Events
        df_events = pd.read_csv(os.path.join(RAW_DATA_DIR, "events.csv"))
        events_to_add = [
            Event(
                id=int(r["event_id"]),
                event_name=str(r["event_name"]),
                event_type=str(r["event_type"]),
                latitude=float(r["latitude"]),
                longitude=float(r["longitude"]),
                start_time=datetime.fromisoformat(r["start_time"]),
                end_time=datetime.fromisoformat(r["end_time"]),
                expected_crowd=int(r["expected_crowd"]),
                affected_radius_km=float(r["affected_radius_km"]),
            )
            for _, r in df_events.iterrows()
        ]
        session.bulk_save_objects(events_to_add)
        session.commit()
        print(f"Seeded {len(events_to_add)} events.")

        # 4. Seed Weather
        df_weather = pd.read_csv(os.path.join(RAW_DATA_DIR, "weather.csv"))
        weather_to_add = [
            Weather(
                station_id=int(r["station_id"]),
                timestamp=datetime.fromisoformat(r["timestamp"]),
                temperature=float(r["temperature"]),
                humidity=float(r["humidity"]),
                wind_speed=float(r["wind_speed"]),
                wind_direction=float(r["wind_direction"]),
                rainfall=float(r["rainfall"]),
            )
            for _, r in df_weather.iterrows()
        ]
        session.bulk_save_objects(weather_to_add)
        session.commit()
        print(f"Seeded {len(weather_to_add)} weather records.")

        # 5. Seed Traffic
        df_traffic = pd.read_csv(os.path.join(RAW_DATA_DIR, "traffic.csv"))
        traffic_to_add = [
            Traffic(
                station_id=int(r["station_id"]),
                timestamp=datetime.fromisoformat(r["timestamp"]),
                traffic_index=int(r["traffic_index"]),
            )
            for _, r in df_traffic.iterrows()
        ]
        session.bulk_save_objects(traffic_to_add)
        session.commit()
        print(f"Seeded {len(traffic_to_add)} traffic records.")

        # 6. Seed Air Quality
        df_aq = pd.read_csv(os.path.join(RAW_DATA_DIR, "air_quality.csv"))
        aq_to_add = [
            AirQuality(
                station_id=int(r["station_id"]),
                timestamp=datetime.fromisoformat(r["timestamp"]),
                pm25=float(r["pm25"]),
                pm10=float(r["pm10"]) if pd.notna(r["pm10"]) else None,
                no2=float(r["no2"]) if pd.notna(r["no2"]) else None,
                so2=float(r["so2"]) if pd.notna(r["so2"]) else None,
                o3=float(r["o3"]) if pd.notna(r["o3"]) else None,
            )
            for _, r in df_aq.iterrows()
        ]
        session.bulk_save_objects(aq_to_add)
        session.commit()
        print(f"Seeded {len(aq_to_add)} air quality records.")

        # Log total counts
        print("\n--- Database Row Count Verification ---")
        print(f"Stations:    {session.query(Station).count()}")
        print(f"Roads:       {session.query(Road).count()}")
        print(f"Events:      {session.query(Event).count()}")
        print(f"Weather:     {session.query(Weather).count()}")
        print(f"Traffic:     {session.query(Traffic).count()}")
        print(f"Air Quality: {session.query(AirQuality).count()}")

    finally:
        session.close()


if __name__ == "__main__":
    seed_database()
