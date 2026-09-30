"""
Alerts Router for AeroAqua API
Provides early-warning alerts endpoints.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Alert, Station
from ..schemas import AlertItem

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertItem])
def get_alerts(
    active: bool = Query(True, description="Filter for currently active alerts"),
    db: Session = Depends(get_db)
):
    """Retrieve early-warning alerts, newest first."""
    query = db.query(Alert, Station.name.label("station_name")).join(
        Station, Alert.station_id == Station.id
    )

    if active:
        query = query.filter(Alert.is_active.is_(True))

    results = query.order_by(desc(Alert.created_at)).all()

    items = []
    for alert, s_name in results:
        items.append(AlertItem(
            id=alert.id,
            station_id=alert.station_id,
            station_name=s_name,
            created_at=alert.created_at.isoformat(),
            risk_level=alert.risk_level,
            title=alert.title,
            message=alert.message,
            current_pm25=round(float(alert.current_pm25), 1),
            forecast_pm25_6h=round(float(alert.forecast_pm25_6h), 1) if alert.forecast_pm25_6h is not None else None,
            is_active=alert.is_active,
        ))

    return items
