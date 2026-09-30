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


