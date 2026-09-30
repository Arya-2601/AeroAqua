"""
Groundwater Dataset Seed Script for AeroAqua
Imports 2012-2021 Kaggle India Ground Water Quality CSVs into SQLite/PostgreSQL.
Also creates initial default Citizen and Authority users.
"""

import glob
import os
import sys
import pandas as pd
import numpy as np

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT_DIR = os.path.dirname(BACKEND_DIR)
sys.path.insert(0, BACKEND_DIR)

from app.database import engine, Base, SessionLocal, init_db
from app.models import GroundwaterQuality, User


def parse_float(val):
    if pd.isna(val):
        return None
    try:
        s = str(val).strip().replace(",", "")
        return float(s)
    except:
        return None


def clean_state_name(state_raw):
    if pd.isna(state_raw):
        return "UNKNOWN"
    s = str(state_raw).strip().upper()
    # Normalize state name aliases
    aliases = {
        "UTTRAKHAND": "UTTARAKHAND",
        "PONDICHERRY": "PUDUCHERRY",
        "ORISSA": "ODISHA",
    }
    return aliases.get(s, s)


def seed_groundwater_and_users(reset=True):
    print("--- Seeding Groundwater Dataset & Default Users ---")
    init_db()
    session = SessionLocal()

    try:
        if reset:
            session.query(GroundwaterQuality).delete()
            session.commit()
            print("Cleared existing groundwater records.")

        files = sorted(glob.glob(os.path.join(ROOT_DIR, "Ground Water *.csv")))
        print(f"Found {len(files)} groundwater CSV files.")

        total_imported = 0
        records_to_insert = []

        for fpath in files:
            fname = os.path.basename(fpath)
            try:
                df = pd.read_csv(fpath, encoding="latin1")
            except Exception as e:
                print(f"Error reading {fname}: {e}")
                continue

            # Standardize column headers
            col_map = {}
            for col in df.columns:
                c_clean = col.replace("\ufeff", "").strip()
                if "station code" in c_clean.lower():
                    col_map[col] = "station_code"
                elif "station name" in c_clean.lower():
                    col_map[col] = "station_name"
                elif "state" in c_clean.lower():
                    col_map[col] = "state"
                elif "temperature min" in c_clean.lower():
                    col_map[col] = "temp_min"
                elif "temperature max" in c_clean.lower():
                    col_map[col] = "temp_max"
                elif "ph min" in c_clean.lower():
                    col_map[col] = "ph_min"
                elif "ph max" in c_clean.lower():
                    col_map[col] = "ph_max"
                elif "conductivity" in c_clean.lower() and "min" in c_clean.lower():
                    col_map[col] = "cond_min"
                elif "conductivity" in c_clean.lower() and "max" in c_clean.lower():
                    col_map[col] = "cond_max"
                elif "year" in c_clean.lower():
                    col_map[col] = "year"

            df = df.rename(columns=col_map)

            # Year fallback from filename if missing
            file_year = 2012
            for y in range(2010, 2030):
                if str(y) in fname:
                    file_year = y
                    break

            for _, row in df.iterrows():
                state = clean_state_name(row.get("state"))
                year = int(row.get("year", file_year)) if pd.notna(row.get("year")) else file_year

                t_min = parse_float(row.get("temp_min"))
                t_max = parse_float(row.get("temp_max"))
                t_mean = round((t_min + t_max) / 2.0, 1) if (t_min is not None and t_max is not None) else (t_min or t_max)

                ph_min = parse_float(row.get("ph_min"))
                ph_max = parse_float(row.get("ph_max"))
                ph_mean = round((ph_min + ph_max) / 2.0, 2) if (ph_min is not None and ph_max is not None) else (ph_min or ph_max)

                c_min = parse_float(row.get("cond_min"))
                c_max = parse_float(row.get("cond_max"))
                c_mean = round((c_min + c_max) / 2.0, 1) if (c_min is not None and c_max is not None) else (c_min or c_max)

                st_code = str(row.get("station_code", "")).replace("\ufeff", "").strip() if pd.notna(row.get("station_code")) else None
                st_name = str(row.get("station_name", "")).strip() if pd.notna(row.get("station_name")) else None

                record = GroundwaterQuality(
                    station_code=st_code,
                    station_name=st_name,
                    state=state,
                    year=year,
                    temp_min=t_min,
                    temp_max=t_max,
                    temp_mean=t_mean,
                    ph_min=ph_min,
                    ph_max=ph_max,
                    ph_mean=ph_mean,
                    conductivity_min=c_min,
                    conductivity_max=c_max,
                    conductivity_mean=c_mean,
                    source="Kaggle — India Ground Water Quality Statewise 2012–2021",
                )
                records_to_insert.append(record)

            print(f"  Processed {fname}: {len(df)} records (Year {file_year})")

        session.bulk_save_objects(records_to_insert)
        session.commit()
        print(f"Successfully seeded {len(records_to_insert)} groundwater records!")

        # Seed initial default users if not present
        existing_users = session.query(User).count()
        if existing_users == 0:
            import hashlib
            def hash_pw(pw):
                return hashlib.sha256(pw.encode()).hexdigest()

            demo_users = [
                User(
                    username="authority",
                    email="authority@aeroaqua.org",
                    hashed_password=hash_pw("admin123"),
                    role="authority",
                    region="Delhi",
                ),
                User(
                    username="citizen",
                    email="citizen@aeroaqua.org",
                    hashed_password=hash_pw("citizen123"),
                    role="citizen",
                    region="Delhi",
                ),
                User(
                    username="researcher",
                    email="researcher@aeroaqua.org",
                    hashed_password=hash_pw("research123"),
                    role="authority",
                    region="Delhi",
                ),
            ]
            session.bulk_save_objects(demo_users)
            session.commit()
            print(f"Seeded {len(demo_users)} initial demo users (authority, citizen).")

    finally:
        session.close()


if __name__ == "__main__":
    seed_groundwater_and_users()
