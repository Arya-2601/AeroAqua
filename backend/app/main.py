"""
AeroAqua Backend Application
FastAPI application with CORS, route registration, and startup self-seeding & training.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import engine, Base, SessionLocal, init_db
from .models import Station
from .routers import stations, anomalies, events, forecast, alerts, simulate
from .services.anomaly import detect_all_stations_anomalies
from .services.correlation import get_station_correlation_context
from .services.forecasting import forecast_station_pm25, load_artifacts
from .services.alerts import evaluate_and_update_station_alert


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup lifecycle:
    1. Initialize tables.
    2. Auto-generate data and seed database if missing or empty.
    3. Auto-train models if missing.
    4. Populate initial anomalies and alerts.
    """
    print("AeroAqua starting up...")
    init_db()

    db = SessionLocal()
    try:
        station_count = db.query(Station).count()
        if station_count == 0:
            print("Database empty. Auto-seeding initial dataset...")
            from scripts.seed_db import seed_database
            seed_database(reset=True)

        # Ensure ML model artifacts exist
        load_artifacts()

        # Run anomaly detection and alert generation for initial demo state
        print("Ensuring active demo anomaly and alerts are initialized...")
        anoms = detect_all_stations_anomalies(db, persist=True)
        zone_b_anom = next((a for a in anoms if a["station_id"] == 2), None)
        if zone_b_anom and zone_b_anom["is_anomaly"]:
            ctx = get_station_correlation_context(db, 2)
            f_res = forecast_station_pm25(db, 2)
            f_items = f_res.get("forecast", [])
            f1 = f_items[0]["pm25"] if len(f_items) > 0 else zone_b_anom["pm25"]
            f3 = f_items[1]["pm25"] if len(f_items) > 1 else zone_b_anom["pm25"]
            f6 = f_items[2]["pm25"] if len(f_items) > 2 else zone_b_anom["pm25"]

            evaluate_and_update_station_alert(
                db=db,
                station_id=2,
                current_pm25=zone_b_anom["pm25"],
                deviation_pct=zone_b_anom["deviation_pct"],
                is_anomaly=True,
                anomaly_severity=zone_b_anom["severity"],
                factors=ctx.get("factors", []),
                forecast_1h=f1,
                forecast_3h=f3,
                forecast_6h=f6,
            )
        print("AeroAqua startup initialization complete.")
    finally:
        db.close()

    yield
    print("AeroAqua shutting down.")


app = FastAPI(
    title="AeroAqua Environmental Intelligence API",
    description="Detect, correlate, predict, and alert on air quality anomalies and environmental risk.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS Configuration
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["Health"])
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


# Include Routers
app.include_router(stations.router)
app.include_router(anomalies.router)
app.include_router(events.router)
app.include_router(forecast.router)
app.include_router(alerts.router)
app.include_router(simulate.router)
