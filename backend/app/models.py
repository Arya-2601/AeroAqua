from datetime import datetime
from sqlalchemy import (
    Column, Integer, Float, String, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from .database import Base


class Station(Base):
    __tablename__ = "stations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    region = Column(String(100), default="Delhi", nullable=False, index=True)
    data_source = Column(String(100), default="Regional Monitoring Data", nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    zone_profile = Column(String(100), nullable=False)
    major_road_count_2km = Column(Integer, default=0)
    distance_to_highway_m = Column(Float, default=0.0)
    distance_to_major_road_m = Column(Float, default=0.0)
    road_density = Column(Float, default=0.0)
    industrial_distance_km = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True, nullable=False, index=True)

    # Relationships
    air_readings = relationship("AirQuality", back_populates="station", cascade="all, delete-orphan")
    weather_readings = relationship("Weather", back_populates="station", cascade="all, delete-orphan")
    traffic_readings = relationship("Traffic", back_populates="station", cascade="all, delete-orphan")
    roads = relationship("Road", back_populates="station", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="station", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="station", cascade="all, delete-orphan")


class Road(Base):
    __tablename__ = "roads"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False, index=True)
    road_name = Column(String(150), nullable=False)
    road_type = Column(String(50), nullable=False)  # highway, major, minor
    distance_m = Column(Float, nullable=False)

    station = relationship("Station", back_populates="roads")


class AirQuality(Base):
    __tablename__ = "air_quality"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    pm25 = Column(Float, nullable=False)
    pm10 = Column(Float, nullable=True)
    no2 = Column(Float, nullable=True)
    so2 = Column(Float, nullable=True)
    o3 = Column(Float, nullable=True)

    station = relationship("Station", back_populates="air_readings")

    __table_args__ = (
        Index("ix_air_quality_station_timestamp", "station_id", "timestamp"),
    )


class Weather(Base):
    __tablename__ = "weather"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    temperature = Column(Float, nullable=False)
    humidity = Column(Float, nullable=False)
    wind_speed = Column(Float, nullable=False)
    wind_direction = Column(Float, nullable=False)
    rainfall = Column(Float, default=0.0)

    station = relationship("Station", back_populates="weather_readings")

    __table_args__ = (
        Index("ix_weather_station_timestamp", "station_id", "timestamp"),
    )


class Traffic(Base):
    __tablename__ = "traffic"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    traffic_index = Column(Integer, nullable=False)

    station = relationship("Station", back_populates="traffic_readings")

    __table_args__ = (
        Index("ix_traffic_station_timestamp", "station_id", "timestamp"),
    )


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    event_name = Column(String(200), nullable=False)
    event_type = Column(String(50), nullable=False)  # festival, sports, concert, gathering, construction, road_closure
    region = Column(String(100), default="Delhi", nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False, index=True)
    expected_crowd = Column(Integer, default=0)
    affected_radius_km = Column(Float, default=2.0)
    description = Column(String(500), nullable=True)
    zone_name = Column(String(100), nullable=True)
    is_cancelled = Column(Boolean, default=False, nullable=False, index=True)


class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=False, index=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    pm25 = Column(Float, nullable=False)
    baseline_mean = Column(Float, nullable=False)
    baseline_std = Column(Float, nullable=False)
    z_score = Column(Float, nullable=False)
    deviation_pct = Column(Float, nullable=False)
    anomaly_score = Column(Float, nullable=False)
    severity = Column(String(50), nullable=False)  # moderate, high, critical
    is_active = Column(Boolean, default=True, index=True)

    station = relationship("Station", back_populates="anomalies")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    station_id = Column(Integer, ForeignKey("stations.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    domain = Column(String(50), default="air", nullable=False)  # air, groundwater
    region = Column(String(100), default="Delhi", nullable=False, index=True)
    risk_level = Column(String(50), nullable=False)  # NORMAL, WATCH, WARNING, CRITICAL
    title = Column(String(255), nullable=False)
    message = Column(String(1000), nullable=False)
    current_pm25 = Column(Float, nullable=True)
    forecast_pm25_6h = Column(Float, nullable=True)
    status = Column(String(50), default="ACTIVE", nullable=False, index=True)  # ACTIVE, BROADCAST, STOPPED, RESOLVED
    is_broadcast = Column(Boolean, default=False, index=True)
    broadcast_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, index=True)

    station = relationship("Station", back_populates="alerts")


class GroundwaterQuality(Base):
    __tablename__ = "groundwater_quality"

    id = Column(Integer, primary_key=True, index=True)
    station_code = Column(String(50), nullable=True, index=True)
    station_name = Column(String(255), nullable=True)
    state = Column(String(100), nullable=False, index=True)
    year = Column(Integer, nullable=False, index=True)
    temp_min = Column(Float, nullable=True)
    temp_max = Column(Float, nullable=True)
    temp_mean = Column(Float, nullable=True)
    ph_min = Column(Float, nullable=True)
    ph_max = Column(Float, nullable=True)
    ph_mean = Column(Float, nullable=True)
    conductivity_min = Column(Float, nullable=True)
    conductivity_max = Column(Float, nullable=True)
    conductivity_mean = Column(Float, nullable=True)
    source = Column(String(200), default="Kaggle — India Ground Water Quality Statewise 2012–2021", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_gw_state_year", "state", "year"),
    )


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="citizen", nullable=False)  # citizen, authority
    region = Column(String(100), default="Delhi", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

