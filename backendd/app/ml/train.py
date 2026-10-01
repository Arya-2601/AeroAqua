"""
Training Pipeline for AeroAqua Multi-Horizon XGBoost Forecasting Models
Trains 3 models (+1h, +3h, +6h) using a chronological 80/20 train/validation split.
Saves models and metrics to backend/app/ml/artifacts/
"""

import json
import os
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
import xgboost as xgb

import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

try:
    from .features import FEATURE_COLUMNS, build_training_dataset
except ImportError:
    from app.ml.features import FEATURE_COLUMNS, build_training_dataset
RAW_DATA_DIR = os.path.join(BASE_DIR, "data", "raw")
ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "artifacts")
os.makedirs(ARTIFACTS_DIR, exist_ok=True)


def train_models():
    print("--- Starting AeroAqua ML Model Training ---")
    start_time = time.time()

    # Load raw data
    stations_path = os.path.join(RAW_DATA_DIR, "stations.csv")
    aq_path = os.path.join(RAW_DATA_DIR, "air_quality.csv")
    weather_path = os.path.join(RAW_DATA_DIR, "weather.csv")
    traffic_path = os.path.join(RAW_DATA_DIR, "traffic.csv")
    events_path = os.path.join(RAW_DATA_DIR, "events.csv")

    if not all(os.path.exists(p) for p in [stations_path, aq_path, weather_path, traffic_path, events_path]):
        print("Missing raw CSV files. Running generator...")
        from scripts.generate_data import generate_all_data
        generate_all_data()

    df_stations = pd.read_csv(stations_path)
    df_aq = pd.read_csv(aq_path)
    df_weather = pd.read_csv(weather_path)
    df_traffic = pd.read_csv(traffic_path)
    df_events = pd.read_csv(events_path)

    print("Building feature dataset...")
    data = build_training_dataset(df_stations, df_aq, df_weather, df_traffic, df_events)
    print(f"Dataset shape: {data.shape} ({len(FEATURE_COLUMNS)} features)")

    # Chronological 80/20 train/val split (no shuffling)
    unique_timestamps = sorted(data["timestamp"].unique())
    split_idx = int(len(unique_timestamps) * 0.8)
    split_time = unique_timestamps[split_idx]

    train_data = data[data["timestamp"] < split_time]
    val_data = data[data["timestamp"] >= split_time]

    print(f"Train samples: {len(train_data)}, Validation samples: {len(val_data)}")

    X_train = train_data[FEATURE_COLUMNS]
    X_val = val_data[FEATURE_COLUMNS]

    horizons = [
        {"name": "1h", "target": "target_1h", "file": "model_1h.joblib"},
        {"name": "3h", "target": "target_3h", "file": "model_3h.joblib"},
        {"name": "6h", "target": "target_6h", "file": "model_6h.joblib"},
    ]

    metrics = {}

    for h in horizons:
        h_name = h["name"]
        target_col = h["target"]
        y_train = train_data[target_col]
        y_val = val_data[target_col]

        print(f"\nTraining XGBoost Regressor for +{h_name} horizon...")
        model = xgb.XGBRegressor(
            n_estimators=180,
            max_depth=5,
            learning_rate=0.06,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=42,
            n_jobs=-1,
        )

        model.fit(X_train, y_train)

        # Evaluation
        preds = model.predict(X_val)
        mae = float(mean_absolute_error(y_val, preds))
        rmse = float(root_mean_squared_error(y_val, preds))

        print(f"  +{h_name} -> MAE: {mae:.2f} µg/m³, RMSE: {rmse:.2f} µg/m³")

        metrics[h_name] = {
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
            "horizon_hours": int(h_name.replace("h", "")),
        }

        # Save model artifact
        model_path = os.path.join(ARTIFACTS_DIR, h["file"])
        joblib.dump(model, model_path)
        print(f"  Saved model to {model_path}")

    # Save metrics
    metrics_path = os.path.join(ARTIFACTS_DIR, "metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    print(f"\nSaved metrics to {metrics_path}")

    elapsed = time.time() - start_time
    print(f"Training completed successfully in {elapsed:.2f}s!")
    return metrics


if __name__ == "__main__":
    train_models()
