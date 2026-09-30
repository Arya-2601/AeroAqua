# 🌍 AeroAqua

> **Detect → Correlate → Predict → Alert**
> An AI-powered environmental intelligence platform that detects abnormal pollution patterns, correlates them with local events, weather, traffic and geospatial context, forecasts near-term pollution risk, and generates actionable early warnings.

**One-line pitch:** AeroAqua turns fragmented environmental data into actionable intelligence by detecting pollution anomalies, explaining their surrounding context, forecasting near-term risk, and issuing early warnings.

**About the name:** *Aero* = air, *Aqua* = water. The 24-hour MVP covers **air quality only**. Water-quality monitoring is a future module (see Roadmap) and must NOT be built now.

---

# 🤖 READ THIS FIRST — Instructions for the AI Coding Agent

You are building the complete AeroAqua MVP from scratch, using this file as the single source of truth. Follow these rules:

1. **Plan first.** Before writing code, produce an implementation plan and task list that follows the phases in [Section 12](#12-build-phases-follow-in-order). Then execute phase by phase.
2. **Do not ask questions for things decided here.** Every technology, file name, schema, endpoint and threshold in this document is a decision. If something is genuinely missing, choose the simplest option and record it in `docs/ASSUMPTIONS.md`.
3. **Zero external accounts required.** The app must run fully offline with **synthetic data** and **no API keys**. Live APIs are optional enhancements only.
4. **Must run with two commands** (backend + frontend) after install. No manual database setup: default to SQLite, with PostgreSQL supported through `DATABASE_URL`.
5. **Verify your work.** After each phase, run the acceptance checks listed for that phase (run the server, hit the endpoint, run the tests, open the UI in the browser). Fix failures before moving on.
6. **Never claim causation.** UI text and API output must say *"potentially relevant factors"* or *"correlated signals"*, never *"caused by"*.
7. **Never commit secrets.** Provide `.env.example`; add `.env` to `.gitignore`.
8. **Keep it simple and demoable.** Prefer a working end-to-end flow over extra features. Do not add anything listed under "Out of Scope".
9. When done, update this README's "Getting Started" section if any command changed, and make sure the [Definition of Done](#13-definition-of-done) checklist passes.

---

# 1. Problem & Solution

Monitoring dashboards report pollution numbers without context. Decision-makers need to know: *Is this reading unusual? What else is happening nearby? Where is the hotspot? What happens next?*

Signals are scattered across air quality, weather, roads/traffic, local events and history. AeroAqua fuses them by **time + location** and answers with a single workflow:

```text
DETECT     → find readings that deviate from a station's normal pattern
CORRELATE  → find nearby events / roads / traffic / wind that coincide with it
PREDICT    → forecast PM2.5 for +1h, +3h, +6h
ALERT      → assign a risk level and produce a human-readable warning
```

```text
   Air Quality    Weather    Local Events    GIS / Traffic
        └────────────┴───────────┴───────────────┘
                          │
                     DATA FUSION (time + location)
                          │
          ┌───────────────┼────────────────┐
       Detect          Correlate         Predict
       Anomaly         Context           Future Risk
          └───────────────┼────────────────┘
                    RISK ASSESSMENT
                          │
                     EARLY ALERT
```

---

# 2. MVP Scope

### ✅ In Scope (must build)

- Synthetic data generator for a demo city (stations, air quality, weather, roads, events)
- Database + REST API (FastAPI)
- Anomaly detection (per-station baseline + z-score)
- Event / traffic / road / wind correlation for anomalies
- XGBoost forecast for +1h, +3h, +6h
- Risk levels and early-warning alerts
- React dashboard: map with hotspots, station detail page with charts, events page, alerts page
- "Simulate pollution spike" demo button
- Automated tests for the core logic
- README-accurate setup instructions that actually work

### ❌ Out of Scope (do NOT build)

- Live traffic API, live event scraping, real weather API dependency
- Push notifications, SMS, email
- User login / authentication
- Multi-city support, mobile app
- Water-quality module
- Docker (optional only if trivial)

---

# 3. Tech Stack (fixed decisions)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React 18 + Vite (JavaScript) | Dev server on port `5173` |
| Styling | Tailwind CSS | Responsive, dark-friendly |
| Map | `react-leaflet` + Leaflet + OpenStreetMap tiles | **No API key needed** |
| Charts | Recharts | Line/area charts |
| HTTP client | Axios (or fetch) | Base URL from `VITE_API_URL` |
| Backend | Python 3.10+ + FastAPI + Uvicorn | Port `8000`, CORS enabled for the frontend |
| ORM | SQLAlchemy 2.x | Works with SQLite and PostgreSQL |
| Validation | Pydantic v2 | Response models for every endpoint |
| ML | XGBoost, scikit-learn | Forecasting + preprocessing |
| Data | pandas, numpy | Feature engineering |
| Model storage | joblib | Saved to `backend/app/ml/artifacts/` |
| Database | **SQLite by default** (`aeroaqua.db`), PostgreSQL via `DATABASE_URL` | No manual DB setup needed |
| Tests | pytest | Backend logic |

`backend/requirements.txt` must include: `fastapi`, `uvicorn[standard]`, `sqlalchemy`, `pydantic`, `pydantic-settings`, `pandas`, `numpy`, `scikit-learn`, `xgboost`, `joblib`, `python-dotenv`, `pytest`, `httpx`, and `psycopg2-binary` (for optional PostgreSQL).

---

# 4. Project Structure (create exactly this)

```text
aeroaqua/
├── README.md
├── LICENSE                      # MIT
├── .gitignore
├── .env.example
├── docs/
│   └── ASSUMPTIONS.md           # any decision the agent had to make
│
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, router registration, startup seeding
│   │   ├── config.py            # settings from env
│   │   ├── database.py          # engine, session, Base
│   │   ├── models.py            # SQLAlchemy tables
│   │   ├── schemas.py           # Pydantic response models
│   │   ├── routers/
│   │   │   ├── stations.py
│   │   │   ├── anomalies.py
│   │   │   ├── events.py
│   │   │   ├── forecast.py
│   │   │   ├── alerts.py
│   │   │   └── simulate.py
│   │   ├── services/
│   │   │   ├── aqi.py           # PM2.5 category + color mapping
│   │   │   ├── anomaly.py       # baseline + z-score detection
│   │   │   ├── correlation.py   # events / roads / traffic / wind context
│   │   │   ├── forecasting.py   # load model, build features, predict
│   │   │   └── alerts.py        # risk level + message generation
│   │   └── ml/
│   │       ├── features.py      # feature engineering (shared by train + inference)
│   │       ├── train.py         # trains XGBoost models, saves artifacts
│   │       └── artifacts/       # saved .joblib models (git-ignored)
│   ├── scripts/
│   │   ├── generate_data.py     # builds synthetic CSVs in /data
│   │   └── seed_db.py           # loads CSVs into the database
│   └── tests/
│       ├── test_aqi.py
│       ├── test_anomaly.py
│       ├── test_correlation.py
│       ├── test_alerts.py
│       └── test_api.py
│
├── data/
│   ├── config.json              # demo city center + zone definitions
│   ├── raw/                     # generated CSVs (stations, air_quality, weather, roads, events)
│   └── processed/
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx              # router + layout
        ├── services/api.js      # all API calls
        ├── utils/aqi.js         # category/color helpers (mirror of backend)
        ├── pages/
        │   ├── Dashboard.jsx
        │   ├── StationDetail.jsx
        │   ├── Events.jsx
        │   └── Alerts.jsx
        └── components/
            ├── Navbar.jsx
            ├── PollutionMap.jsx
            ├── StationCard.jsx
            ├── AlertBanner.jsx
            ├── AnomalyPanel.jsx
            ├── ContextPanel.jsx
            ├── ForecastChart.jsx
            ├── HistoryChart.jsx
            ├── EventList.jsx
            └── SimulateSpikeButton.jsx
```

---

# 5. Data Design

## 5.1 Demo City & Zones

`data/config.json` defines one demo city (default: **Delhi**, center `28.6139, 77.2090`; changeable). Define **6 stations** spread across the city, named as zones (`Zone A` … `Zone F`), each with lat/lon, and a `zone_profile`:

| Zone | Profile | Baseline PM2.5 | Notes |
|---|---|---|---|
| A | Residential | ~65 | Calm, few roads |
| B | Commercial + stadium | ~90 | **Demo hotspot**: near a large event venue, 3 major roads |
| C | Industrial | ~110 | Industrial area 0.8 km away |
| D | Highway corridor | ~100 | Adjacent to a highway |
| E | Green / park | ~50 | Lowest pollution |
| F | Mixed urban | ~80 | Average |

## 5.2 Synthetic Data Generator (`backend/scripts/generate_data.py`)

Use a **fixed random seed (42)** so results are reproducible. Generate the last **30 days of hourly data ending at the current hour**.

**Air quality** (per station, per hour): PM2.5, PM10, NO2, SO2, O3.
- `PM2.5 = baseline × daily_pattern × weekly_pattern × weather_effect + noise`
- Daily pattern: peaks at 08:00–10:00 and 18:00–21:00 (rush hours), lowest 03:00–05:00.
- Weekly pattern: ~10% lower on weekends.
- Weather effect: low wind speed → higher PM2.5; rainfall → lower PM2.5 (wash-out).
- Noise: Gaussian, ~5–8% of baseline.
- PM10 ≈ PM2.5 × 1.6–2.0; other pollutants correlated but simple.

**Weather** (per station, per hour): temperature, humidity, wind_speed (m/s), wind_direction (degrees, 0–360), rainfall (mm). Smooth daily temperature/humidity cycle plus random variation.

**Roads** (`roads.csv`): for each station, a list of nearby major roads (`road_id`, `station_id`, `road_type` = `highway | major | minor`, `distance_m`). Derive station-level features: `major_road_count_2km`, `distance_to_highway_m`, `distance_to_major_road_m`, `road_density`, `industrial_distance_km`.

**Traffic index** (0–100): derived deterministically from hour-of-day (rush hours high), weekday, and station road features. Also increased during active events near the station.

**Events** (`events.csv`) — generate ~12 events across the 30 days plus **at least 2 events active or starting within the next 6 hours**, including one near Zone B:

```text
event_id, event_name, event_type, latitude, longitude,
start_time, end_time, expected_crowd, affected_radius_km
```

Event types: `festival | sports | concert | gathering | construction | road_closure`.

**Scripted demo anomaly (important):** the generator MUST inject a pollution spike at **Zone B during the most recent 3 hours** (PM2.5 ≈ +65–75% above its normal value for that hour), coinciding with the active stadium event near Zone B, high traffic and low wind. Zone C should show a *milder* elevated (non-anomalous) reading. Other zones stay normal. This guarantees the dashboard demo works on first launch.

## 5.3 Database Tables (`models.py`)

| Table | Columns |
|---|---|
| `stations` | id, name, latitude, longitude, zone_profile, major_road_count_2km, distance_to_highway_m, distance_to_major_road_m, road_density, industrial_distance_km |
| `air_quality` | id, station_id (FK), timestamp, pm25, pm10, no2, so2, o3 — index on (station_id, timestamp) |
| `weather` | id, station_id (FK), timestamp, temperature, humidity, wind_speed, wind_direction, rainfall |
| `traffic` | id, station_id (FK), timestamp, traffic_index |
| `events` | id, event_name, event_type, latitude, longitude, start_time, end_time, expected_crowd, affected_radius_km |
| `anomalies` | id, station_id (FK), timestamp, pm25, baseline_mean, baseline_std, z_score, deviation_pct, anomaly_score, severity, is_active |
| `alerts` | id, station_id (FK), created_at, risk_level, title, message, current_pm25, forecast_pm25_6h, is_active |

`scripts/seed_db.py` creates tables and loads the CSVs. `main.py` must **auto-generate data, seed the DB, and train the model on first startup** if the DB or model artifacts are missing (so the user never has to run extra scripts).

---

# 6. Core Logic (implement exactly)

## 6.1 PM2.5 Categories (`services/aqi.py`)

Use these PM2.5 ranges (µg/m³), the same categories in the frontend:

| Range | Category | Color |
|---|---|---|
| 0–30 | Good | `#22c55e` (green) |
| 31–60 | Satisfactory | `#84cc16` (light green) |
| 61–90 | Moderate | `#eab308` (yellow) |
| 91–120 | Poor | `#f97316` (orange) |
| 121–250 | Very Poor | `#ef4444` (red) |
| 251+ | Severe | `#7f1d1d` (dark red) |

## 6.2 Anomaly Detection (`services/anomaly.py`)

For each station's latest reading:

1. Build the baseline from the previous **14 days** of readings at the **same hour of day** (and same weekday-type: weekday vs weekend if ≥ 5 samples, else all days). Compute `baseline_mean` and `baseline_std` (floor `baseline_std` at 5% of the mean to avoid divide-by-near-zero).
2. `z_score = (current − baseline_mean) / baseline_std`
3. `deviation_pct = (current − baseline_mean) / baseline_mean × 100`
4. **Anomaly if** `z_score ≥ 2.5` **OR** (`deviation_pct ≥ 40` **AND** `z_score ≥ 1.5`).
5. `anomaly_score = clamp(z_score / 5, 0, 1) × 100`
6. Severity: `moderate` (z 2.5–3.5), `high` (z 3.5–5), `critical` (z > 5 or PM2.5 > 250).
7. Store in `anomalies`; mark older active anomalies for that station as inactive when the latest reading is normal.

Optionally add an `IsolationForest` score as a secondary signal, but the z-score rule above is the primary, deterministic method.

## 6.3 Correlation Engine (`services/correlation.py`)

Given an anomaly (station, timestamp), return a **context object** with *potentially relevant factors*:

- **Events:** all events within `max(affected_radius_km, 3 km)` of the station (haversine distance) whose time window overlaps `[anomaly_time − 2h, anomaly_time + 2h]`. Return name, type, distance_km, expected_crowd, status (`active | upcoming | ended`).
- **Roads:** `major_road_count_2km`, `distance_to_highway_m`, `distance_to_major_road_m`.
- **Traffic:** current `traffic_index` with label: `<35 LOW`, `35–65 MODERATE`, `>65 HIGH`.
- **Wind:** speed, direction, and whether the wind is blowing **from the nearest active event/industrial source toward the station** (compare wind bearing to the bearing from source to station, within ±45°). Label low wind (`< 2 m/s`) as a possible accumulation condition.
- **Industrial proximity:** `industrial_distance_km`.
- **Relevance score per factor (0–1)** using simple weighted rules (for example an active event within 2 km = 0.9, high traffic = 0.7, low wind = 0.6). Sort factors by relevance descending.
- **Every factor's wording must be non-causal**, for example: "Large public event 1.8 km away (active) — potentially relevant."

## 6.4 Forecasting (`ml/features.py`, `ml/train.py`, `services/forecasting.py`)

Train **three XGBoost regressors** (direct multi-horizon): targets are PM2.5 at **+1h, +3h, +6h**.

Features (built identically for training and inference):

`lag_1`, `lag_2`, `lag_3`, `lag_6`, `lag_24`, `rolling_mean_3`, `rolling_mean_6`, `rolling_mean_24`, `rolling_std_6`, `hour`, `day_of_week`, `is_weekend`, `temperature`, `humidity`, `wind_speed`, `wind_direction_sin`, `wind_direction_cos`, `rainfall`, `traffic_index`, `event_active` (0/1 within radius), `event_distance_km` (or 50 if none), `major_road_count_2km`, `distance_to_highway_m`, `industrial_distance_km`.

Training rules:
- One model per horizon trained on **all stations pooled**.
- **Time-based split** (last 20% of time = validation). Do not shuffle.
- Log MAE and RMSE per horizon to console and save to `backend/app/ml/artifacts/metrics.json`.
- Save models with joblib. Training must finish in **under 60 seconds** on a laptop (use `n_estimators≈200`, `max_depth≈5`).
- Inference returns predicted PM2.5 for +1h, +3h, +6h plus category and color per horizon, plus a simple confidence range (`± validation MAE`).

## 6.5 Risk & Alerts (`services/alerts.py`)

Compute a `risk_level` per station from the current reading, anomaly state and 6-hour forecast:

| Level | Rule |
|---|---|
| `CRITICAL` | Any of current or forecast PM2.5 > 250, OR critical anomaly |
| `WARNING` | Forecast (+3h or +6h) PM2.5 > 120, OR high anomaly |
| `WATCH` | Anomaly of any severity, OR forecast rising by ≥ 20% within 6h and reaching > 90 |
| `NORMAL` | Otherwise |

Create an alert record when a station is `WATCH` or above, with:
- `title`, e.g. `Elevated pollution risk expected in Zone B`
- `message`, e.g. `PM2.5 is 154 µg/m³, 69% above the usual level for this hour. Potentially relevant factors: large public event 1.8 km away, high traffic, low wind. Forecast: 162 (+1h), 181 (+3h), 205 (+6h).`
- Do not create duplicate active alerts for the same station and level.

---

# 7. REST API Contract

Base URL `http://localhost:8000`. All responses are JSON. Interactive docs at `/docs`. Enable CORS for `http://localhost:5173`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | `{ "status": "ok" }` |
| GET | `/api/stations` | All stations with latest PM2.5, category, color, risk_level, is_anomaly, deviation_pct |
| GET | `/api/stations/{id}` | One station with static features + latest values |
| GET | `/api/stations/{id}/readings?hours=48` | Time series of PM2.5 plus baseline band (`baseline_mean`, `baseline_upper` = mean + 2.5·std) |
| GET | `/api/stations/{id}/context` | Correlation output (section 6.3) for the latest reading |
| GET | `/api/stations/{id}/forecast` | Forecast output (section 6.4) |
| GET | `/api/anomalies?active=true` | Active anomalies with severity and z_score |
| GET | `/api/events?status=all` | Events, filterable by `active | upcoming | ended` |
| GET | `/api/alerts?active=true` | Active alerts, newest first |
| POST | `/api/simulate/spike` | Body `{ "station_id": 3, "magnitude_pct": 70 }`: inserts an elevated latest reading for the station, then re-runs anomaly, correlation, forecast and alert logic |
| POST | `/api/simulate/reset` | Restores original synthetic data |

### Example: `GET /api/stations/2/context`

```json
{
  "station_id": 2,
  "station_name": "Zone B",
  "timestamp": "2026-09-30T14:00:00",
  "anomaly": { "is_anomaly": true, "z_score": 4.1, "deviation_pct": 69.2, "severity": "high" },
  "factors": [
    { "type": "event", "text": "Large public event 1.8 km away (active)", "relevance": 0.9, "details": { "event_name": "City Stadium Match", "distance_km": 1.8, "status": "active" } },
    { "type": "traffic", "text": "Traffic index is HIGH (78)", "relevance": 0.7 },
    { "type": "wind", "text": "Low wind speed (1.2 m/s) — possible accumulation conditions", "relevance": 0.6 },
    { "type": "roads", "text": "3 major roads within 2 km", "relevance": 0.5 }
  ],
  "disclaimer": "These are potentially relevant factors, not confirmed causes."
}
```

### Example: `GET /api/stations/2/forecast`

```json
{
  "station_id": 2,
  "current": { "pm25": 154, "category": "Very Poor", "color": "#ef4444" },
  "forecast": [
    { "horizon_hours": 1, "pm25": 162, "category": "Very Poor", "color": "#ef4444", "range": [150, 174] },
    { "horizon_hours": 3, "pm25": 181, "category": "Very Poor", "color": "#ef4444", "range": [169, 193] },
    { "horizon_hours": 6, "pm25": 205, "category": "Very Poor", "color": "#ef4444", "range": [193, 217] }
  ],
  "risk_level": "WARNING"
}
```

---

# 8. Frontend Requirements

**Look & feel:** clean, modern, dashboard style. Dark navy header, light or dark body, rounded cards, subtle shadows. Use the category colors from section 6.1 consistently. Must be responsive (desktop first, usable on mobile). Project name "AeroAqua" with a small 🌍 or wave/air icon in the navbar.

### Routes

| Route | Page |
|---|---|
| `/` | Dashboard |
| `/station/:id` | Station Detail |
| `/events` | Events |
| `/alerts` | Alerts |

### Dashboard (`/`)

- **Alert banner** at top if any `WARNING` or `CRITICAL` alert is active (shows title and a "View details" link).
- **Summary cards row:** number of stations, active anomalies, active alerts, highest current PM2.5 (with station name).
- **Interactive map** (`PollutionMap`): centered on the city from `data/config.json`, one colored circle marker per station (color = PM2.5 category, radius scaled by PM2.5). Anomalous stations get a pulsing red ring. Also draw event markers (distinct icon) with their `affected_radius_km` as a faint circle. Clicking a station shows a popup (name, PM2.5, category, deviation, "View details" button).
- **Station list/cards** beside or below the map, sorted by risk (worst first). Each card shows name, PM2.5, category chip, anomaly badge, and 6h trend arrow.
- **Legend** for PM2.5 categories.
- **"Simulate pollution spike" button** (`SimulateSpikeButton`): choose a station and magnitude, POST to `/api/simulate/spike`, then refresh all data. Also a "Reset demo" button.
- Auto-refresh data every 30 seconds.

### Station Detail (`/station/:id`)

- Header: station name, current PM2.5, category chip, risk-level badge.
- **Anomaly panel:** current vs historical average, deviation %, z-score, severity, with the text "🚨 Significant anomaly detected" when active.
- **History chart (48h):** PM2.5 line with the shaded baseline band, with anomalous points highlighted.
- **Context panel:** ranked list of potentially relevant factors with icons (🏟️ event, 🚗 traffic, 🛣️ roads, 💨 wind, 🏭 industry) and the disclaimer text from the API.
- **Forecast chart:** current → +1h → +3h → +6h with colored category points and a confidence range.
- **Early-warning box:** shows the alert message when an alert is active.
- Back link to the dashboard.

### Events page (`/events`)

Table/list of events with type, time window, expected crowd, status chip (`active | upcoming | ended`), and filter tabs.

### Alerts page (`/alerts`)

List of alerts with risk-level badge, title, message, time, station link.

### General UX

Loading skeletons/spinners, friendly error states if the API is down, empty states, and no console errors.

---

# 9. Configuration

`.env.example` (root):

```env
# Database (default is SQLite, no setup needed)
DATABASE_URL=sqlite:///./aeroaqua.db
# For PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/aeroaqua

FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:8000
```

No API keys are required for the MVP.

---

# 10. Getting Started (must work as written)

**Prerequisites:** Python 3.10+, Node.js 18+.

**Backend**

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

On first start the backend generates the data, seeds the database and trains the model automatically. API at `http://localhost:8000`, docs at `http://localhost:8000/docs`.

**Frontend** (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

**Tests**

```bash
cd backend
pytest
```

---

# 11. Testing Requirements

Minimum tests (pytest):

- `test_aqi.py`: category boundaries (30/31, 60/61, 90/91, 120/121, 250/251).
- `test_anomaly.py`: normal value → no anomaly; +70% spike → anomaly; std floor prevents divide-by-zero.
- `test_correlation.py`: haversine distance, event inside/outside radius and time window, wind-bearing logic.
- `test_alerts.py`: each risk-level rule; no duplicate active alerts.
- `test_api.py`: `/api/health`, `/api/stations`, `/api/stations/{id}/forecast`, `/api/simulate/spike` return valid shapes (use FastAPI `TestClient`).

---

# 12. Build Phases (follow in order)

| Phase | Deliverable | Acceptance check |
|---|---|---|
| **1. Scaffold** | Folder structure, `requirements.txt`, `package.json`, `.gitignore`, `.env.example`, LICENSE | Both projects install without errors |
| **2. Data** | `generate_data.py`, `data/config.json`, CSVs in `data/raw/` | 6 stations, ~30 days hourly data, events file present, Zone B spike in last 3 hours |
| **3. Database** | `models.py`, `database.py`, `seed_db.py` | Tables created and populated; row counts logged |
| **4. Core logic** | `aqi.py`, `anomaly.py`, `correlation.py`, `alerts.py` + their tests | `pytest` passes; Zone B flagged as anomaly |
| **5. ML** | `features.py`, `train.py`, `forecasting.py` | Models saved; metrics logged; forecast returns 3 horizons in under 1 second |
| **6. API** | All routers from section 7, startup auto-seed + auto-train | Every endpoint responds correctly in `/docs`; `test_api.py` passes |
| **7. Frontend** | Layout, Dashboard, map, Station Detail, charts, Events, Alerts, simulate button | Full demo flow (section 14) works in the browser without console errors |
| **8. Polish** | Loading/error states, responsive layout, README accuracy | Fresh-clone install and run works with only the commands in section 10 |

---

# 13. Definition of Done

- [ ] Backend starts with one command and self-seeds data and model
- [ ] Frontend starts with one command and shows the map with 6 colored stations
- [ ] Zone B is flagged as an anomaly on first launch, with an event/traffic/wind context list
- [ ] Forecast shows +1h / +3h / +6h values with colors for Zone B
- [ ] An early-warning banner and an entry on the Alerts page appear for Zone B
- [ ] "Simulate pollution spike" works on any station and updates the UI
- [ ] All pytest tests pass
- [ ] No API keys required; no secrets committed
- [ ] All wording uses "potentially relevant / correlated", never "caused by"
- [ ] README setup instructions were tested exactly as written

---

# 14. Demo Flow

```text
Open Dashboard  →  Map shows Zone B in red with a pulsing ring, alert banner visible
      ↓
Click Zone B    →  Popup: PM2.5 154, +69% above normal
      ↓
Station Detail  →  History chart with baseline band and highlighted spike
      ↓
Context panel   →  Stadium event 1.8 km (active), HIGH traffic, low wind, 3 major roads
      ↓
Forecast chart  →  162 → 181 → 205 µg/m³ (rising)
      ↓
Early warning   →  "Elevated pollution risk expected in Zone B"
      ↓
Click "Simulate spike" on another station to show live re-detection
```

---

# 15. Challenges & Design Decisions

| Challenge | Decision |
|---|---|
| Multi-source data alignment (different timestamps and resolutions) | Everything is normalized to **hourly timestamps + station location** before feature engineering |
| Avoiding false attribution | Output is always phrased as *potentially relevant factors*, with a visible disclaimer |
| Live API risk during a 24-hour build | MVP runs on synthetic, structured datasets; live traffic/events are optional later enhancements |
| Demo reliability | Seeded random data with a scripted Zone B anomaly, plus a simulate button |

---

# 16. Roadmap (do not build now)

**Short term:** real air-quality datasets (CPCB / OpenAQ), real weather ingestion, better forecast validation.
**Medium term:** live traffic integration, automated event ingestion, multi-pollutant forecasting, source-attribution modeling, hotspot propagation analysis.
**Long term:** 💧 **Aqua module (water-quality monitoring)**, multi-city platform, authority dashboard, citizen mobile/PWA app, personalized alerts, automated reports, real-time notifications.

---

# 17. Team

| Member | Responsibility |
|---|---|
| **[Member 1]** | AI/ML & Data |
| **[Member 2]** | Backend & APIs |
| **[Member 3]** | Frontend & UI/UX |
| **[Member 4]** | GIS & Data Engineering |
| **[Member 5]** | Integration, Testing & Presentation |

---

# 18. License

MIT License. See [`LICENSE`](LICENSE).

---

> **AeroAqua doesn't just tell you that pollution is high. It helps answer what changed, what factors coincide with the change, where the risk is emerging, and what may happen next.**
>
> ## **Detect. Correlate. Predict. Alert.** 🌍
