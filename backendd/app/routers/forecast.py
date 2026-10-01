"""
Forecast Router for AeroAqua API
Provides station forecast endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Station
from ..schemas import StationForecastResponse
from ..services.forecasting import forecast_station_pm25

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])


@router.get("/{station_id}", response_model=StationForecastResponse)
def get_forecast(station_id: int, db: Session = Depends(get_db)):
    """Retrieve forecast for a given station."""
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        raise HTTPException(status_code=404, detail="Station not found")

    return forecast_station_pm25(db, station_id)
