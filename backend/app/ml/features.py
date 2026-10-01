"""
Feature Engineering for AeroAqua PM2.5 Forecasting
Shared by training and real-time inference.
"""

import math
from datetime import datetime
from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "lag_1", "lag_2", "lag_3", "lag_6", "lag_24",
    "rolling_mean_3", "rolling_mean_6", "rolling_mean_24", "rolling_std_6",
    "hour", "day_of_week", "is_weekend",
    "temperature", "humidity", "wind_speed",
    "wind_direction_sin", "wind_direction_cos", "rainfall",
    "traffic_index", "event_active", "event_distance_km",
    "major_road_count_2km", "distance_to_highway_m", "industrial_distance_km"
]


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2.0) ** 2
    )
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def compute_station_event_proximity(
    station_lat: float,
    station_lon: float,
    target_dt: datetime,
    events: List[Dict[str, Any]]
) -> tuple[int, float]:
    """
    Returns (event_active, event_distance_km).
    event_active is 1 if an active event is within affected_radius_km, else 0.
    event_distance_km is distance to nearest active event, or 50.0 if none.
    """
    active_dists = []
    for ev in events:
        start = ev["start_time"] if isinstance(ev["start_time"], datetime) else datetime.fromisoformat(ev["start_time"])
        end = ev["end_time"] if isinstance(ev["end_time"], datetime) else datetime.fromisoformat(ev["end_time"])
        if start <= target_dt <= end:
            d = haversine_km(station_lat, station_lon, float(ev["latitude"]), float(ev["longitude"]))
            radius = float(ev.get("affected_radius_km", 3.0))
            if d <= radius:
                active_dists.append(d)

    if active_dists:
        return 1, round(float(min(active_dists)), 2)
    return 0, 50.0


def build_training_dataset(
    df_stations: pd.DataFrame,
    df_aq: pd.DataFrame,
    df_weather: pd.DataFrame,
    df_traffic: pd.DataFrame,
    df_events: pd.DataFrame
) -> pd.DataFrame:
    """
    Build multi-station dataset with features and target horizons (+1h, +3h, +6h).
    """
    df_aq = df_aq.copy()
    df_weather = df_weather.copy()
    df_traffic = df_traffic.copy()

    df_aq["timestamp"] = pd.to_datetime(df_aq["timestamp"])
    df_weather["timestamp"] = pd.to_datetime(df_weather["timestamp"])
    df_traffic["timestamp"] = pd.to_datetime(df_traffic["timestamp"])

    # Merge weather and traffic on (station_id, timestamp)
    merged = pd.merge(df_aq, df_weather, on=["station_id", "timestamp"], how="inner")
    merged = pd.merge(merged, df_traffic, on=["station_id", "timestamp"], how="inner")
    merged = pd.merge(merged, df_stations, left_on="station_id", right_on="id", how="inner")

    merged = merged.sort_values(["station_id", "timestamp"]).reset_index(drop=True)

    # Convert events into dicts
    events_list = df_events.to_dict(orient="records")

    dfs_by_station = []
    for s_id, s_df in merged.groupby("station_id"):
        s_df = s_df.sort_values("timestamp").copy()

        # PM2.5 Lags
        s_df["lag_1"] = s_df["pm25"].shift(1)
        s_df["lag_2"] = s_df["pm25"].shift(2)
        s_df["lag_3"] = s_df["pm25"].shift(3)
        s_df["lag_6"] = s_df["pm25"].shift(6)
        s_df["lag_24"] = s_df["pm25"].shift(24)

        # Rolling statistics (using past values up to lag 1)
        s_df["rolling_mean_3"] = s_df["pm25"].shift(1).rolling(window=3, min_periods=1).mean()
        s_df["rolling_mean_6"] = s_df["pm25"].shift(1).rolling(window=6, min_periods=1).mean()
        s_df["rolling_mean_24"] = s_df["pm25"].shift(1).rolling(window=24, min_periods=1).mean()
        s_df["rolling_std_6"] = s_df["pm25"].shift(1).rolling(window=6, min_periods=1).std().fillna(0.0)

        # Targets (+1h, +3h, +6h ahead)
        s_df["target_1h"] = s_df["pm25"].shift(-1)
        s_df["target_3h"] = s_df["pm25"].shift(-3)
        s_df["target_6h"] = s_df["pm25"].shift(-6)

        dfs_by_station.append(s_df)

    full_df = pd.concat(dfs_by_station, ignore_index=True)

    # Temporal features
    full_df["hour"] = full_df["timestamp"].dt.hour
    full_df["day_of_week"] = full_df["timestamp"].dt.dayofweek
    full_df["is_weekend"] = (full_df["day_of_week"] >= 5).astype(int)

    # Cyclical wind direction
    full_df["wind_direction_rad"] = np.radians(full_df["wind_direction"])
    full_df["wind_direction_sin"] = np.sin(full_df["wind_direction_rad"])
    full_df["wind_direction_cos"] = np.cos(full_df["wind_direction_rad"])

    # Event proximity features
    event_active_vals = []
    event_dist_vals = []
    for _, row in full_df.iterrows():
        act, dist = compute_station_event_proximity(
            row["latitude"], row["longitude"], row["timestamp"].to_pydatetime(), events_list
        )
        event_active_vals.append(act)
        event_dist_vals.append(dist)

    full_df["event_active"] = event_active_vals
    full_df["event_distance_km"] = event_dist_vals

    # Drop rows where lags or targets are NaN
    clean_df = full_df.dropna(subset=FEATURE_COLUMNS + ["target_1h", "target_3h", "target_6h"]).copy()
    clean_df = clean_df.sort_values("timestamp").reset_index(drop=True)

    return clean_df


def build_inference_features(
    history_pm25_series: List[float],  # At least 25 recent hourly values ending with current
    current_weather: Dict[str, float],
    current_traffic_index: int,
    station_meta: Dict[str, Any],
    target_dt: datetime,
    events: List[Dict[str, Any]]
) -> pd.DataFrame:
    """
    Build a single-row feature DataFrame for real-time inference.
    """
    series = pd.Series(history_pm25_series)
    curr_pm25 = float(series.iloc[-1])

    lag_1 = float(series.iloc[-2]) if len(series) >= 2 else curr_pm25
    lag_2 = float(series.iloc[-3]) if len(series) >= 3 else lag_1
    lag_3 = float(series.iloc[-4]) if len(series) >= 4 else lag_2
    lag_6 = float(series.iloc[-7]) if len(series) >= 7 else lag_3
    lag_24 = float(series.iloc[-25]) if len(series) >= 25 else lag_6

    # Past series excluding current
    past_series = series.iloc[:-1]
    rolling_mean_3 = float(past_series.tail(3).mean()) if len(past_series) >= 1 else curr_pm25
    rolling_mean_6 = float(past_series.tail(6).mean()) if len(past_series) >= 1 else curr_pm25
    rolling_mean_24 = float(past_series.tail(24).mean()) if len(past_series) >= 1 else curr_pm25
    rolling_std_6 = float(past_series.tail(6).std()) if len(past_series) > 1 else 0.0
    if math.isnan(rolling_std_6):
        rolling_std_6 = 0.0

    hour = target_dt.hour
    day_of_week = target_dt.weekday()
    is_weekend = 1 if day_of_week >= 5 else 0

    wind_dir = current_weather.get("wind_direction", 0.0)
    wind_rad = math.radians(wind_dir)
    wind_sin = math.sin(wind_rad)
    wind_cos = math.cos(wind_rad)

    ev_act, ev_dist = compute_station_event_proximity(
        float(station_meta["latitude"]),
        float(station_meta["longitude"]),
        target_dt,
        events
    )

    feature_dict = {
        "lag_1": lag_1,
        "lag_2": lag_2,
        "lag_3": lag_3,
        "lag_6": lag_6,
        "lag_24": lag_24,
        "rolling_mean_3": rolling_mean_3,
        "rolling_mean_6": rolling_mean_6,
        "rolling_mean_24": rolling_mean_24,
        "rolling_std_6": rolling_std_6,
        "hour": hour,
        "day_of_week": day_of_week,
        "is_weekend": is_weekend,
        "temperature": float(current_weather.get("temperature", 25.0)),
        "humidity": float(current_weather.get("humidity", 50.0)),
        "wind_speed": float(current_weather.get("wind_speed", 2.5)),
        "wind_direction_sin": wind_sin,
        "wind_direction_cos": wind_cos,
        "rainfall": float(current_weather.get("rainfall", 0.0)),
        "traffic_index": int(current_traffic_index),
        "event_active": int(ev_act),
        "event_distance_km": float(ev_dist),
        "major_road_count_2km": int(station_meta.get("major_road_count_2km", 1)),
        "distance_to_highway_m": float(station_meta.get("distance_to_highway_m", 1000.0)),
        "industrial_distance_km": float(station_meta.get("industrial_distance_km", 5.0)),
    }

    return pd.DataFrame([feature_dict])[FEATURE_COLUMNS]
