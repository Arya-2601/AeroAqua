"""
Pydantic Schemas for AeroAqua REST API
Defines response and request data structures for all endpoints.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"


# Station Schemas
class StationSummary(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    zone_profile: str
    current_pm25: float
    category: str
    color: str
    risk_level: str
    is_anomaly: bool
    deviation_pct: float
    severity: str
    last_updated: Optional[str] = None


class StationDetail(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    zone_profile: str
    major_road_count_2km: int
    distance_to_highway_m: float
    distance_to_major_road_m: float
    road_density: float
    industrial_distance_km: float
    current_pm25: float
    category: str
    color: str
    risk_level: str
    is_anomaly: bool
    deviation_pct: float
    severity: str
    latest_weather: Optional[Dict[str, Any]] = None
    latest_traffic: Optional[Dict[str, Any]] = None


class ReadingItem(BaseModel):
    timestamp: str
    pm25: float
    baseline_mean: float
    baseline_upper: float
    is_anomaly: bool = False


class StationReadingsResponse(BaseModel):
    station_id: int
    station_name: str
    hours: int
    readings: List[ReadingItem]


# Context / Correlation Schemas
class FactorDetail(BaseModel):
    type: str  # event, traffic, wind, roads, industry
    text: str
    relevance: float
    details: Optional[Dict[str, Any]] = None


class AnomalySummary(BaseModel):
    is_anomaly: bool
    z_score: float
    deviation_pct: float
    severity: str


class StationContextResponse(BaseModel):
    station_id: int
    station_name: str
    timestamp: str
    anomaly: AnomalySummary
    factors: List[FactorDetail]
    disclaimer: str = "These are potentially relevant factors, not confirmed causes."


# Forecast Schemas
class ForecastHorizonItem(BaseModel):
    horizon_hours: int
    pm25: float
    category: str
    color: str
    range: List[float]


class CurrentReading(BaseModel):
    pm25: float
    category: str
    color: str
    timestamp: Optional[str] = None


class StationForecastResponse(BaseModel):
    station_id: int
    station_name: Optional[str] = None
    current: CurrentReading
    forecast: List[ForecastHorizonItem]
    risk_level: str
    inference_time_ms: Optional[float] = None


# Anomaly Entity Schema
class AnomalyItem(BaseModel):
    id: int
    station_id: int
    station_name: str
    timestamp: str
    pm25: float
    baseline_mean: float
    baseline_std: float
    z_score: float
    deviation_pct: float
    anomaly_score: float
    severity: str
    is_active: bool


# Event Schema
class EventItem(BaseModel):
    id: int
    event_name: str
    event_type: str
    latitude: float
    longitude: float
    start_time: str
    end_time: str
    expected_crowd: int
    affected_radius_km: float
    status: str  # active, upcoming, ended


# Alert Schema
class AlertItem(BaseModel):
    id: int
    station_id: int
    station_name: str
    created_at: str
    risk_level: str
    title: str
    message: str
    current_pm25: float
    forecast_pm25_6h: Optional[float] = None
    is_active: bool


# Simulation Schemas
class SimulateSpikeRequest(BaseModel):
    station_id: int = Field(..., ge=1, le=6)
    magnitude_pct: float = Field(70.0, ge=10.0, le=300.0)


class SimulateSpikeResponse(BaseModel):
    status: str
    message: str
    station_id: int
    updated_pm25: float
    anomaly: Dict[str, Any]
    forecast: Dict[str, Any]
    alert: Optional[Dict[str, Any]] = None


class SimulateResetResponse(BaseModel):
    status: str
    message: str
