import os
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "aeroaqua.db").replace("\\", "/")


class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

    model_config = SettingsConfigDict(env_file=".env", extra="allow")


settings = Settings()

# Normalize relative sqlite path to repository root if using default ./aeroaqua.db
if settings.DATABASE_URL == "sqlite:///./aeroaqua.db":
    settings.DATABASE_URL = f"sqlite:///{DEFAULT_DB_PATH}"
