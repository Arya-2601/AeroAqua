import os
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "aeroaqua.db").replace("\\", "/")


class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    AIR_QUALITY_API_KEY: str = os.getenv(
        "AIR_QUALITY_API_KEY",
        "24c9b0b213941e7a23884698584a94d438df4cab7ec480d1384857b1d0322bb3"
    )
    AIR_QUALITY_API_URL: str = os.getenv("AIR_QUALITY_API_URL", "https://api.openaq.org/v3")
    WEATHER_API_URL: str = os.getenv("WEATHER_API_URL", "https://api.open-meteo.com/v1/forecast")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "aeroaqua-hackathon-super-secret-key-2026")

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


settings = Settings()

# Normalize relative sqlite path to repository root if using default ./aeroaqua.db
if settings.DATABASE_URL == "sqlite:///./aeroaqua.db":
    settings.DATABASE_URL = f"sqlite:///{DEFAULT_DB_PATH}"
