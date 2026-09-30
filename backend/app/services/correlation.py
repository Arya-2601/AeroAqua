"""
Correlation Engine for AeroAqua
Extracts contextual factors (events, traffic, roads, wind, industrial proximity)
coinciding with a station reading.
Strictly uses non-causal phrasing ("potentially relevant", "correlated").
"""

import math
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc
from ..models import Station, Road, AirQuality, Weather, Traffic, Event, Anomaly
from .anomaly import detect_station_latest_anomaly


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance between two coordinates in kilometers."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2.0) ** 2
    )
    return round(2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)), 2)


def calculate_bearing_deg(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate initial compass bearing from (lat1, lon1) towards (lat2, lon2) in degrees 0..360."""
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dlon = math.radians(lon2 - lon1)
    y = math.sin(dlon) * math.cos(p2)
    x = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dlon)
    bearing = (math.degrees(math.atan2(y, x)) + 360.0) % 360.0
    return round(bearing, 1)


def is_wind_blowing_from_source(
    wind_direction: float,
    source_lat: float,
    source_lon: float,
    station_lat: float,
    station_lon: float,
    tolerance_deg: float = 45.0
) -> bool:
    """
    Check if wind blowing FROM wind_direction aligns with the bearing from source to station.
    Wind direction is the direction the wind originates from.
    """
    bearing_from_source = calculate_bearing_deg(source_lat, source_lon, station_lat, station_lon)
    diff = abs(wind_direction - bearing_from_source) % 360.0
    angular_dist = 360.0 - diff if diff > 180.0 else diff
    return angular_dist <= tolerance_deg


def get_station_correlation_context(
    db: Session,
    station_id: int,
    target_dt: Optional[datetime] = None
) -> Dict[str, Any]:
    station = db.query(Station).filter(Station.id == station_id).first()
    if not station:
        return {}

    # Latest air quality reading
    aq_query = db.query(AirQuality).filter(AirQuality.station_id == station_id)
    if target_dt:
        aq_query = aq_query.filter(AirQuality.timestamp <= target_dt)
    latest_aq = aq_query.order_by(desc(AirQuality.timestamp)).first()

    curr_ts = latest_aq.timestamp if latest_aq else datetime.utcnow()

    # Detect or fetch anomaly status
    anomaly_status = detect_station_latest_anomaly(db, station_id, target_dt=curr_ts, persist=False)

    # Latest Weather
    weather = db.query(Weather).filter(
        Weather.station_id == station_id,
        Weather.timestamp <= curr_ts
    ).order_by(desc(Weather.timestamp)).first()

    # Latest Traffic
    traffic = db.query(Traffic).filter(
        Traffic.station_id == station_id,
        Traffic.timestamp <= curr_ts
    ).order_by(desc(Traffic.timestamp)).first()

    factors: List[Dict[str, Any]] = []

    # 1. Event Factors
    # Events within max(affected_radius_km, 3km) whose time window overlaps [curr_ts - 2h, curr_ts + 2h]
    window_start = curr_ts - timedelta(hours=2)
    window_end = curr_ts + timedelta(hours=2)

    all_events = db.query(Event).filter(
        Event.start_time <= window_end,
        Event.end_time >= window_start
    ).all()

    active_event_sources = []
    for ev in all_events:
        dist = haversine_distance_km(station.latitude, station.longitude, ev.latitude, ev.longitude)
        threshold_dist = max(ev.affected_radius_km, 3.0)
        if dist <= threshold_dist:
            # Determine status
            if ev.start_time <= curr_ts <= ev.end_time:
                status = "active"
                relevance = 0.90 if dist <= 2.0 else 0.75
                active_event_sources.append((ev.latitude, ev.longitude, ev.event_name))
            elif curr_ts < ev.start_time:
                status = "upcoming"
                relevance = 0.55 if dist <= 2.0 else 0.40
            else:
                status = "ended"
                relevance = 0.35

            crowd_str = f" ({ev.expected_crowd:,} expected)" if ev.expected_crowd > 0 else ""
            factors.append({
                "type": "event",
                "text": f"{ev.event_name} {dist} km away ({status}){crowd_str} — potentially relevant.",
                "relevance": round(relevance, 2),
                "details": {
                    "event_name": ev.event_name,
                    "event_type": ev.event_type,
                    "distance_km": dist,
                    "expected_crowd": ev.expected_crowd,
                    "status": status,
                    "affected_radius_km": ev.affected_radius_km
                }
            })

    # 2. Traffic Factors
    if traffic:
        t_val = traffic.traffic_index
        if t_val > 65:
            t_label = "HIGH"
            t_rel = 0.70
        elif t_val >= 35:
            t_label = "MODERATE"
            t_rel = 0.45
        else:
            t_label = "LOW"
            t_rel = 0.20

        factors.append({
            "type": "traffic",
            "text": f"Traffic index is {t_label} ({t_val}) — correlated signal.",
            "relevance": round(t_rel, 2),
            "details": {
                "traffic_index": t_val,
                "label": t_label
            }
        })

    # 3. Wind Factors
    if weather:
        w_speed = weather.wind_speed
        w_dir = weather.wind_direction
        w_rel = 0.30
        w_notes = []

        if w_speed < 2.0:
            w_rel = max(w_rel, 0.60)
            w_notes.append("possible accumulation conditions")

        # Check alignment from active events or industrial source
        aligned_source = None
        for ev_lat, ev_lon, ev_name in active_event_sources:
            if is_wind_blowing_from_source(w_dir, ev_lat, ev_lon, station.latitude, station.longitude):
                aligned_source = ev_name
                w_rel = max(w_rel, 0.80)
                break

        if not aligned_source and station.industrial_distance_km <= 2.5:
            # Approximate industrial point
            ind_lat = station.latitude - 0.007
            ind_lon = station.longitude + 0.006
            if is_wind_blowing_from_source(w_dir, ind_lat, ind_lon, station.latitude, station.longitude):
                aligned_source = "industrial corridor"
                w_rel = max(w_rel, 0.70)

        wind_desc = f"Wind speed {w_speed} m/s, direction {w_dir}°"
        if aligned_source:
            wind_desc += f", blowing towards station from {aligned_source}"
        if w_notes:
            wind_desc += f" ({', '.join(w_notes)})"
        wind_desc += " — potentially relevant."

        factors.append({
            "type": "wind",
            "text": wind_desc,
            "relevance": round(w_rel, 2),
            "details": {
                "wind_speed": w_speed,
                "wind_direction": w_dir,
                "aligned_source": aligned_source,
                "is_low_wind": w_speed < 2.0
            }
        })

    # 4. Roads Factors
    if station.major_road_count_2km > 0 or station.distance_to_highway_m < 2000:
        road_rel = 0.50 if station.major_road_count_2km >= 3 or station.distance_to_highway_m < 500 else 0.35
        roads_desc = f"{station.major_road_count_2km} major road(s) within 2 km (closest highway: {int(station.distance_to_highway_m)} m) — correlated geospatial context."
        factors.append({
            "type": "roads",
            "text": roads_desc,
            "relevance": round(road_rel, 2),
            "details": {
                "major_road_count_2km": station.major_road_count_2km,
                "distance_to_highway_m": station.distance_to_highway_m,
                "distance_to_major_road_m": station.distance_to_major_road_m,
                "road_density": station.road_density
            }
        })

    # 5. Industrial Proximity Factor
    if station.industrial_distance_km <= 3.0:
        ind_rel = 0.65 if station.industrial_distance_km <= 1.0 else 0.40
        factors.append({
            "type": "industry",
            "text": f"Industrial area located {station.industrial_distance_km} km away — correlated geospatial factor.",
            "relevance": round(ind_rel, 2),
            "details": {
                "industrial_distance_km": station.industrial_distance_km
            }
        })

    # Sort factors by relevance descending
    factors.sort(key=lambda x: x["relevance"], reverse=True)

    return {
        "station_id": station.id,
        "station_name": station.name,
        "timestamp": curr_ts.isoformat(),
        "anomaly": {
            "is_anomaly": anomaly_status.get("is_anomaly", False),
            "z_score": anomaly_status.get("z_score", 0.0),
            "deviation_pct": anomaly_status.get("deviation_pct", 0.0),
            "severity": anomaly_status.get("severity", "none"),
        },
        "factors": factors,
        "disclaimer": "These are potentially relevant factors, not confirmed causes."
    }
