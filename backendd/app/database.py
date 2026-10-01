import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from .config import settings

# For SQLite, set check_same_thread to False
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    # Check and add new columns to alerts, stations, and events tables if missing
    from sqlalchemy import text
    with engine.connect() as conn:
        for col_name, col_type in [
            ("domain", "VARCHAR(50) DEFAULT 'air'"),
            ("region", "VARCHAR(100) DEFAULT 'Delhi'"),
            ("status", "VARCHAR(50) DEFAULT 'ACTIVE'"),
            ("is_broadcast", "BOOLEAN DEFAULT 0"),
            ("broadcast_at", "DATETIME"),
            ("resolved_at", "DATETIME"),
            ("provenance", "VARCHAR(50) DEFAULT 'LIVE'"),
            ("why_explanation", "VARCHAR(1000)"),
            ("deviation_pct", "FLOAT"),
            ("anomaly_severity", "VARCHAR(50)"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE alerts ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            except Exception:
                pass

        # Station migrations
        try:
            conn.execute(text("ALTER TABLE stations ADD COLUMN is_active BOOLEAN DEFAULT 1"))
            conn.commit()
        except Exception:
            pass

        # User personalization migrations
        for col_name, col_type in [
            ("preferred_city", "VARCHAR(100)"),
            ("preferred_zone", "VARCHAR(100)"),
            ("notify_anomalies", "BOOLEAN DEFAULT 1"),
            ("notify_broadcasts", "BOOLEAN DEFAULT 1"),
            ("notify_events", "BOOLEAN DEFAULT 1"),
            ("notify_forecast_changes", "BOOLEAN DEFAULT 1"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            except Exception:
                pass

        # Event migrations
        for col_name, col_type in [
            ("zone_name", "VARCHAR(100)"),
            ("is_cancelled", "BOOLEAN DEFAULT 0"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE events ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            except Exception:
                pass

        # ZoneRequest migrations
        for col_name, col_type in [
            ("reference_id", "VARCHAR(50)"),
            ("applicant_name", "VARCHAR(150)"),
            ("email", "VARCHAR(150)"),
            ("phone", "VARCHAR(50)"),
            ("description", "VARCHAR(1000)"),
            ("rejection_reason", "VARCHAR(1000)"),
            ("authority_notes", "VARCHAR(1000)"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE zone_requests ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            except Exception:
                pass

        # CitizenReport migrations
        for col_name, col_type in [
            ("reference_id", "VARCHAR(50)"),
            ("reporter_name", "VARCHAR(150)"),
            ("email", "VARCHAR(150)"),
            ("phone", "VARCHAR(50)"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE citizen_reports ADD COLUMN {col_name} {col_type}"))
                conn.commit()
            except Exception:
                pass


