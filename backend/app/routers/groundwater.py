"""
Groundwater Router for AeroAqua API
Provides historical groundwater quality state-wise data, baselines, and trends.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.groundwater_service import (
    get_available_states,
    get_state_groundwater_summary,
    get_state_groundwater_trends
)

router = APIRouter(prefix="/api/groundwater", tags=["Groundwater"])


@router.get("/states")
def list_states(db: Session = Depends(get_db)):
    """List all Indian states available in the historical groundwater dataset."""
    return get_available_states(db)


@router.get("/summary")
def get_summary(
    state: str = Query("DELHI", description="State name, e.g. DELHI, MAHARASHTRA, PUNJAB"),
    db: Session = Depends(get_db)
):
    """Retrieve comprehensive historical groundwater quality summary, baselines, and risk."""
    return get_state_groundwater_summary(db, state)


@router.get("/trends")
def get_trends(
    state: str = Query("DELHI", description="State name"),
    parameter: str = Query("ph", description="Parameter: ph, conductivity, temperature"),
    db: Session = Depends(get_db)
):
    """Retrieve year-over-year trend series (2012-2021) for a specific parameter."""
    trends = get_state_groundwater_trends(db, state, parameter)
    return {
        "state": state.strip().upper(),
        "parameter": parameter.lower().strip(),
        "trends": trends,
    }

