# AeroAqua Design Assumptions & Technical Decisions

This document records architectural choices, data formatting details, and design decisions made to satisfy the project specification.

## 1. Demo City & Coordinates
- **City:** Delhi, India (Center: Latitude `28.6139`, Longitude `77.2090`).
- **Stations (Zones A–F):**
  - **Zone A (Residential):** Lat 28.6500, Lon 77.1800. Baseline PM2.5: ~65 µg/m³. Calm, few major roads.
  - **Zone B (Commercial + Stadium):** Lat 28.6139, Lon 77.2090 (City Center/Stadium). Baseline PM2.5: ~90 µg/m³. Scripted demo anomaly with active stadium event, high traffic index, low wind speed.
  - **Zone C (Industrial):** Lat 28.5800, Lon 77.2500. Baseline PM2.5: ~110 µg/m³. Industrial zone 0.8 km away.
  - **Zone D (Highway Corridor):** Lat 28.6700, Lon 77.2300. Baseline PM2.5: ~100 µg/m³. Adjacent to major national highway.
  - **Zone E (Green / Park):** Lat 28.5900, Lon 77.1600. Baseline PM2.5: ~50 µg/m³. Lowest pollution zone.
  - **Zone F (Mixed Urban):** Lat 28.6300, Lon 77.2600. Baseline PM2.5: ~80 µg/m³. Average urban profile.

## 2. Temporal Grid & Synthetic Seed
- Synthetic data generates 30 days (720 hours) up to the current wall-clock hour.
- Random seed is fixed at `42` for exact reproducibility.
- Scripted spike: Zone B receives an elevated reading (+65% to +75% above normal for that hour) during the most recent 3 hours, coinciding with an active sports/stadium event.

## 3. Correlation & Non-Causation Language
- In strict adherence to Rule 6, all UI text and API response factors express non-causality:
  - Phrasing format: `"{Description} — potentially relevant."` or `"Correlated signals"`.
  - API disclaimer included: `"These are potentially relevant factors, not confirmed causes."`

## 4. Machine Learning & Forecasting
- Direct multi-horizon forecasting is implemented with 3 independent XGBoost Regressors (`+1h`, `+3h`, `+6h`).
- Model evaluation uses a 80/20 chronological time-split across all stations.
- Forecast response includes PM2.5 point estimate, PM2.5 AQI category, category hex color, and confidence range (`± validation MAE`).
