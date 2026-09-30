# AeroAqua

**Detect. Correlate. Predict. Alert.**

AeroAqua is an environmental intelligence platform that detects abnormal air-pollution patterns, correlates them with local events, weather, traffic and geospatial context, forecasts near-term pollution levels, and issues early warnings.

[![Hackathon](https://img.shields.io/badge/24--Hour-Hackathon-blueviolet)](#)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20Tailwind-61DAFB)](#)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)](#)
[![ML](https://img.shields.io/badge/ML-XGBoost%20%7C%20scikit--learn-orange)](#)
[![Database](https://img.shields.io/badge/Database-SQLite%20%7C%20PostgreSQL-336791)](#)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

Live Demo: [DEPLOYED_URL]()Specification: [SPEC.md](SPEC.md)

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Overview](#solution-overview)
3. [Features](#features)
4. [Methodology](#methodology)
5. [Screenshots](#screenshots)
6. [Technology Stack](#technology-stack)
7. [Getting Started](#getting-started)
8. [API Overview](#api-overview)
9. [Project Structure](#project-structure)
10. [Design Decisions](#design-decisions)
11. [Roadmap](#roadmap)
12. [Team](#team)
13. [License](#license)

---

## Problem Statement

Environmental monitoring dashboards report pollution measurements but rarely provide the context needed to interpret them. Given a reading such as PM2.5 = 154 µg/m³, a decision-maker still needs to determine:

- Whether the value is unusual for that location and time of day.
- Which nearby factors, such as events, traffic, wind or industry, coincide with it.
- Where the hotspot is located.
- Whether conditions are likely to worsen.

The relevant signals exist but are distributed across air-quality, weather, road, event and historical data sources.

## Solution Overview

AeroAqua integrates these sources by time and location and applies a four-stage workflow:

| Stage | Description |
|---|---|
| Detect | Identifies readings that deviate from a station's expected pattern for the given hour. |
| Correlate | Identifies nearby events, road, traffic and wind conditions that coincide with the anomaly. |
| Predict | Forecasts PM2.5 concentrations for the next 1, 3 and 6 hours using XGBoost. |
| Alert | Assigns a risk level and generates a plain-language early warning. |

AeroAqua reports potentially relevant factors and correlations. It does not assert that any single event or factor is the cause of a pollution spike.

---

## Features

- **Geospatial hotspot map.** Interactive map with color-coded stations, highlighted anomalies and event zones.
- **Context-aware anomaly detection.** Baselines are computed per station and hour of day, using z-scores and percentage deviation.
- **Event and context correlation.** Nearby events, road density, traffic level, wind direction and industrial proximity are scored and ranked by relevance.
- **Near-term forecasting.** PM2.5 predictions at +1, +3 and +6 hours with confidence ranges.
- **Early-warning alerts.** Four risk levels: Normal, Watch, Warning and Critical.
- **Spike simulation.** A demonstration control that injects a pollution spike at any station and re-runs detection, correlation, forecasting and alerting.
- **Offline operation.** No API keys are required. A reproducible synthetic data generator is included.

### Example Output

```text
--------------------------------------------
ZONE B
--------------------------------------------
Current PM2.5                 154 ug/m3
Usual value for this hour      91 ug/m3
Deviation                     +69%

Status: ANOMALY DETECTED

Potentially relevant factors
  Large public event          1.8 km (active)
  Traffic                     HIGH
  Wind                        Low (1.2 m/s)
  Major roads within 2 km     3

Forecast
  +1 hour                     162 ug/m3
  +3 hours                    181 ug/m3
  +6 hours                    205 ug/m3

Alert: Elevated pollution risk expected.
--------------------------------------------
```

---

## Methodology

### System Architecture

```text
  Air Quality      Weather      Local Events      GIS / Traffic
       |              |              |                 |
       +--------------+--------------+-----------------+
                             |
                  Data Fusion (time + location)
                             |
             +---------------+---------------+
             |               |               |
          Anomaly        Correlation      Forecasting
         Detection         Engine          (XGBoost)
             |               |               |
             +---------------+---------------+
                             |
                     Risk Assessment
                             |
                Early Alerts and Dashboard
```

### Anomaly Detection

For each station, the latest reading is compared with the preceding 14 days of readings at the same hour of day. A reading is flagged as anomalous when its z-score is at least 2.5, or when it exceeds the baseline by at least 40% and its z-score is at least 1.5.

### Correlation

Events within range and within the relevant time window, together with road, traffic and wind conditions, are scored between 0 and 1 and presented in descending order of relevance as potentially relevant factors.

### Forecasting

Three XGBoost regression models, one per horizon, are trained on lag features, rolling statistics, calendar features, weather, traffic, event indicators and geographic features. Validation uses a time-based split. Validation MAE and RMSE are recorded for each horizon.

### Risk Levels

| Level | Condition |
|---|---|
| Normal | No anomaly and no elevated forecast. |
| Watch | An anomaly is detected, or a meaningful upward trend is forecast. |
| Warning | A high-severity anomaly, or forecast PM2.5 above 120 µg/m³. |
| Critical | A critical anomaly, or current or forecast PM2.5 above 250 µg/m³. |

### PM2.5 Categories (µg/m³)

| Range | Category |
|---|---|
| 0 – 30 | Good |
| 31 – 60 | Satisfactory |
| 61 – 90 | Moderate |
| 91 – 120 | Poor |
| 121 – 250 | Very Poor |
| 251 and above | Severe |

---

## Screenshots

Screenshots are stored in `docs/screenshots/`.

| Dashboard | Station Detail |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Station Detail](docs/screenshots/station-detail.png) |

| Anomaly and Context | Forecast and Alerts |
|---|---|
| ![Context](docs/screenshots/context.png) | ![Forecast](docs/screenshots/forecast.png) |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, React-Leaflet (OpenStreetMap), Recharts |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Machine Learning and Data | XGBoost, scikit-learn, pandas, NumPy |
| Database | SQLite (default) or PostgreSQL |
| Testing | pytest |

---

## Getting Started

### Prerequisites

- Python 3.10 or later
- Node.js 18 or later
- Git

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/aeroaqua.git
cd aeroaqua
```

### 2. Start the backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

On first launch, the backend generates demonstration data, seeds the database and trains the forecasting models. No additional scripts or API keys are required.

- API: http://localhost:8000
- Interactive documentation: http://localhost:8000/docs

### 3. Start the frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```

The application is available at http://localhost:5173.

### 4. Run the tests

```bash
cd backend
pytest
```

### Optional: PostgreSQL

Copy `.env.example` to `.env` and set the connection string:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/aeroaqua
```

Do not commit `.env` files or credentials to the repository.

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check. |
| GET | `/api/stations` | All stations with latest PM2.5, category and risk level. |
| GET | `/api/stations/{id}/readings` | Time series with baseline band. |
| GET | `/api/stations/{id}/context` | Ranked, potentially relevant factors. |
| GET | `/api/stations/{id}/forecast` | Forecast for +1, +3 and +6 hours. |
| GET | `/api/anomalies` | Active anomalies. |
| GET | `/api/events` | Local events (active, upcoming, ended). |
| GET | `/api/alerts` | Active early-warning alerts. |
| POST | `/api/simulate/spike` | Simulates a pollution spike (demonstration). |
| POST | `/api/simulate/reset` | Restores the original demonstration data. |

Complete request and response schemas are available at `/docs` while the backend is running.

---

## Project Structure

```text
aeroaqua/
├── backend/
│   ├── app/
│   │   ├── routers/        # API endpoints
│   │   ├── services/       # anomaly, correlation, forecasting, alerts
│   │   ├── ml/             # feature engineering and model training
│   │   └── main.py
│   ├── scripts/            # data generation and database seeding
│   └── tests/
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       └── services/
├── data/                   # configuration and generated datasets
├── docs/                   # screenshots and notes
├── SPEC.md                 # detailed build specification
└── README.md
```

---

## Design Decisions

| Challenge | Approach |
|---|---|
| Data from different sources and resolutions | All data is normalized to hourly timestamps and station location before feature engineering. |
| Risk of false attribution | Output is phrased as potentially relevant factors, accompanied by a visible disclaimer. |
| Dependence on live APIs | The MVP runs on reproducible synthetic data. Live feeds are planned as optional extensions. |
| Demonstration reliability | Seeded data contains a scripted anomaly, and a spike-simulation control is provided. |

**Data notice.** The current version uses synthetic demonstration data. Displayed values are illustrative and do not represent real measurements.

---

## Roadmap

- Integration of real air-quality data (for example CPCB or OpenAQ) and live weather data.
- Live traffic and automated event ingestion.
- Multi-pollutant forecasting (PM10, NO2, O3).
- Source-attribution and hotspot-propagation analysis.
- Aqua module for water-quality monitoring.
- Push, SMS and email notifications.
- Multi-city support and an authority-facing
