"""
Anomalies Router for AeroAqua API
Provides list of detected anomalies.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import Anomaly, Station
from ..schemas import AnomalyItem
from ..services.datetime_service import format_ist_iso

router = APIRouter(prefix="/api/anomalies", tags=["Anomalies"])


@router.get("", response_model=List[AnomalyItem])
def get_anomalies(
    active: bool = Query(True, description="Filter for currently active anomalies"),
    db: Session = Depends(get_db)
):
    """Retrieve list of anomalies."""
    query = db.query(Anomaly, Station.name.label("station_name")).join(
        Station, Anomaly.station_id == Station.id
    )

    if active:
        query = query.filter(Anomaly.is_active.is_(True))

    results = query.order_by(desc(Anomaly.timestamp)).all()

    items = []
    for anom, s_name in results:
        items.append(AnomalyItem(
            id=anom.id,
            station_id=anom.station_id,
            station_name=s_name,
            timestamp=format_ist_iso(anom.timestamp),
            pm25=round(float(anom.pm25), 1),
            baseline_mean=round(float(anom.baseline_mean), 1),
            baseline_std=round(float(anom.baseline_std), 1),
            z_score=round(float(anom.z_score), 2),
            deviation_pct=round(float(anom.deviation_pct), 1),
            anomaly_score=round(float(anom.anomaly_score), 1),
            severity=anom.severity,
            is_active=anom.is_active,
        ))

    return items
