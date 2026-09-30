"""
Groundwater Quality Intelligence Service for AeroAqua
Analyzes historical groundwater parameters (pH, Conductivity, Temperature)
from CPCB / Kaggle 2012-2021 state-wise monitoring records.
Computes historical baselines, deviation %, z-scores, parameter trends, and groundwater risk.
"""

from typing import Dict, Any, List, Optional
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from ..models import GroundwaterQuality


BIS_STANDARDS = {
    "ph": {
        "unit": "pH",
        "name": "pH Level",
        "desirable_min": 6.5,
        "desirable_max": 8.5,
        "critical_min": 5.5,
        "critical_max": 9.2,
        "description": "Acidity / Alkalinity level (BIS IS 10500 potable range: 6.5 - 8.5)"
    },
    "conductivity": {
        "unit": "µmhos/cm",
        "name": "Electrical Conductivity",
        "desirable_max": 750.0,
        "permissible_max": 2000.0,
        "critical_max": 4000.0,
        "description": "Total dissolved mineral conductivity (BIS IS 10500: desirable < 750, permissible < 2000)"
    },
    "temperature": {
        "unit": "°C",
        "name": "Water Temperature",
        "desirable_min": 15.0,
        "desirable_max": 35.0,
        "description": "Aquifer in-situ water temperature"
    }
}


def get_available_states(db: Session) -> List[Dict[str, Any]]:
    """Return all states present in the historical groundwater dataset."""
    results = (
        db.query(
            GroundwaterQuality.state,
            func.count(GroundwaterQuality.id).label("records_count"),
            func.min(GroundwaterQuality.year).label("min_year"),
            func.max(GroundwaterQuality.year).label("max_year"),
        )
        .group_by(GroundwaterQuality.state)
        .order_by(GroundwaterQuality.state)
        .all()
    )

    states = []
    for r in results:
        states.append({
            "state": r.state,
            "records_count": r.records_count,
            "year_range": f"{r.min_year} - {r.max_year}",
        })
    return states


def calculate_parameter_baseline(values: List[float]) -> tuple[float, float]:
    """Calculate mean and standard deviation with 5% floor."""
    if not values:
        return 0.0, 1.0
    mean_val = float(np.mean(values))
    std_val = float(np.std(values, ddof=1)) if len(values) > 1 else 0.0
    min_std = max(0.05 * abs(mean_val), 0.05)
    return round(mean_val, 2), round(max(std_val, min_std), 2)


def get_state_groundwater_summary(db: Session, state: str) -> Dict[str, Any]:
    """
    Produce comprehensive historical groundwater analysis for a given state.
    Strictly uses actual parameters present in Kaggle dataset (pH, Conductivity, Temperature).
    """
    clean_state = state.strip().upper()
    query = db.query(GroundwaterQuality).filter(GroundwaterQuality.state == clean_state)
    total_records = query.count()

    if total_records == 0:
        return {
            "state": state.strip().upper(),
            "dataset_label": "Historical Groundwater Quality (2012–2021)",
            "source": "Kaggle — India Ground Water Quality Statewise 2012–2021",
            "disclaimer": "Historical groundwater quality data based on CPCB state-wise monitoring. Not real-time measurements.",
            "years_covered": "N/A",
            "year_range": {"min": None, "max": None},
            "latest_observation_year": None,
            "unique_stations_count": 0,
            "total_monitoring_stations": 0,
            "total_records": 0,
            "groundwater_risk_level": "UNKNOWN",
            "groundwater_risk_reason": "Insufficient historical data for a reliable screening assessment.",
            "groundwater_risk": {
                "level": "UNKNOWN",
                "summary": "Insufficient historical data for a reliable screening assessment.",
                "reason": "Insufficient historical data for a reliable screening assessment.",
            },
            "parameters": [],
            "parameters_map": {},
        }

    # Find available years
    years = [
        r[0] for r in db.query(GroundwaterQuality.year)
        .filter(GroundwaterQuality.state == clean_state)
        .distinct()
        .order_by(GroundwaterQuality.year)
        .all()
    ]
    latest_year = max(years) if years else 2021

    # Extract all historical records for baseline computation
    all_records = query.all()
    all_ph = [r.ph_mean for r in all_records if r.ph_mean is not None]
    all_cond = [r.conductivity_mean for r in all_records if r.conductivity_mean is not None]
    all_temp = [r.temp_mean for r in all_records if r.temp_mean is not None]

    # Latest year records for current historical observation
    latest_records = [r for r in all_records if r.year == latest_year]
    latest_ph_vals = [r.ph_mean for r in latest_records if r.ph_mean is not None]
    latest_cond_vals = [r.conductivity_mean for r in latest_records if r.conductivity_mean is not None]
    latest_temp_vals = [r.temp_mean for r in latest_records if r.temp_mean is not None]

    latest_ph = round(float(np.mean(latest_ph_vals)), 2) if latest_ph_vals else None
    latest_cond = round(float(np.mean(latest_cond_vals)), 1) if latest_cond_vals else None
    latest_temp = round(float(np.mean(latest_temp_vals)), 1) if latest_temp_vals else None

    # Compute Baselines & Z-Scores
    parameters = []
    reasons = []
    is_high = False
    is_moderate = False

    # 1. pH Parameter
    if all_ph:
        b_mean, b_std = calculate_parameter_baseline(all_ph)
        if latest_ph is not None:
            dev_pct = round(((latest_ph - b_mean) / b_mean) * 100.0, 1)
            z_score = round((latest_ph - b_mean) / b_std, 2)
            # Evaluate risk per BIS IS 10500
            if latest_ph < 6.0 or latest_ph > 9.0 or abs(z_score) >= 2.5:
                p_risk = "HIGH"
                p_status = "Outside Desirable Potable Range (6.5 - 8.5)"
                is_high = True
                reasons.append(f"observed pH ({latest_ph}) shows notable deviation ({dev_pct}%) from the historical state baseline ({b_mean})")
            elif latest_ph < 6.5 or latest_ph > 8.5 or abs(z_score) >= 1.5:
                p_risk = "MODERATE"
                p_status = "Moderate Historical Variance"
                is_moderate = True
                reasons.append(f"observed pH ({latest_ph}) is slightly outside desirable potable limits (6.5–8.5)")
            else:
                p_risk = "LOW"
                p_status = "Within Potable Limits (6.5 - 8.5)"
                reasons.append(f"pH ({latest_ph}) is within the selected reference range (6.5–8.5)")
        else:
            dev_pct, z_score, p_risk, p_status = 0.0, 0.0, "LOW", "No latest reading"

        parameters.append({
            "key": "ph",
            "name": BIS_STANDARDS["ph"]["name"],
            "unit": BIS_STANDARDS["ph"]["unit"],
            "latest_value": latest_ph,
            "latest_mean": latest_ph,
            "baseline_mean": b_mean,
            "baseline_std": b_std,
            "observed_min": round(float(np.min(all_ph)), 2) if all_ph else None,
            "observed_max": round(float(np.max(all_ph)), 2) if all_ph else None,
            "deviation_pct": dev_pct,
            "z_score": z_score,
            "risk_level": p_risk,
            "status": p_risk,
            "status_text": p_status,
            "description": BIS_STANDARDS["ph"]["description"],
            "samples_count": len(all_ph),
        })

    # 2. Electrical Conductivity Parameter
    if all_cond:
        b_mean, b_std = calculate_parameter_baseline(all_cond)
        if latest_cond is not None:
            dev_pct = round(((latest_cond - b_mean) / b_mean) * 100.0, 1)
            z_score = round((latest_cond - b_mean) / b_std, 2)
            # Evaluate risk per BIS IS 10500
            if latest_cond > 2000.0 or z_score >= 2.5:
                p_risk = "HIGH"
                p_status = "Exceeds Permissible Limit (2000 µmhos/cm)"
                is_high = True
                reasons.append(f"historical EC indicates elevated dissolved-ion levels ({latest_cond} µmhos/cm) relative to the permissible benchmark (2,000 µmhos/cm)")
            elif latest_cond > 750.0 or z_score >= 1.5:
                p_risk = "MODERATE"
                p_status = "Elevated Dissolved Solids Above Desirable Limit"
                is_moderate = True
                reasons.append(f"historical EC indicates moderate dissolved-ion levels ({latest_cond} µmhos/cm) above desirable reference (750 µmhos/cm)")
            else:
                p_risk = "LOW"
                p_status = "Desirable Mineral Level (< 750 µmhos/cm)"
                reasons.append(f"Electrical Conductivity remains at desirable levels ({latest_cond} µmhos/cm)")
        else:
            dev_pct, z_score, p_risk, p_status = 0.0, 0.0, "LOW", "No latest reading"

        parameters.append({
            "key": "conductivity",
            "name": BIS_STANDARDS["conductivity"]["name"],
            "unit": BIS_STANDARDS["conductivity"]["unit"],
            "latest_value": latest_cond,
            "latest_mean": latest_cond,
            "baseline_mean": b_mean,
            "baseline_std": b_std,
            "observed_min": round(float(np.min(all_cond)), 1) if all_cond else None,
            "observed_max": round(float(np.max(all_cond)), 1) if all_cond else None,
            "deviation_pct": dev_pct,
            "z_score": z_score,
            "risk_level": p_risk,
            "status": p_risk,
            "status_text": p_status,
            "description": BIS_STANDARDS["conductivity"]["description"],
            "samples_count": len(all_cond),
        })

    # 3. Water Temperature Parameter
    if all_temp:
        b_mean, b_std = calculate_parameter_baseline(all_temp)
        dev_pct = round(((latest_temp - b_mean) / b_mean) * 100.0, 1) if latest_temp else 0.0
        z_score = round((latest_temp - b_mean) / b_std, 2) if latest_temp else 0.0
        parameters.append({
            "key": "temperature",
            "name": BIS_STANDARDS["temperature"]["name"],
            "unit": BIS_STANDARDS["temperature"]["unit"],
            "latest_value": latest_temp,
            "latest_mean": latest_temp,
            "baseline_mean": b_mean,
            "baseline_std": b_std,
            "observed_min": round(float(np.min(all_temp)), 1) if all_temp else None,
            "observed_max": round(float(np.max(all_temp)), 1) if all_temp else None,
            "deviation_pct": dev_pct,
            "z_score": z_score,
            "risk_level": "LOW",
            "status": "LOW",
            "status_text": "Normal In-situ Range",
            "description": BIS_STANDARDS["temperature"]["description"],
            "samples_count": len(all_temp),
        })

    # Determine overall Groundwater Risk: LOW, MODERATE, HIGH
    if is_high:
        gw_risk = "HIGH"
    elif is_moderate:
        gw_risk = "MODERATE"
    else:
        gw_risk = "LOW"

    # Data-driven unique explanation
    def format_sentence(s: str) -> str:
        s = s.strip()
        if s.startswith("pH"):
            return "pH" + s[2:]
        return s[0].upper() + s[1:] if s else s

    if len(reasons) >= 2:
        r0 = format_sentence(reasons[0])
        gw_risk_reason = f"{r0}, while {reasons[1]}. Risk screening is influenced primarily by the parameter that deviates most from the selected reference standard."
    elif len(reasons) == 1:
        r0 = format_sentence(reasons[0])
        gw_risk_reason = f"{r0}. Historical measurements remain relatively stable across available monitoring years."
    else:
        gw_risk_reason = "Historical measurements remain relatively stable across the available years."

    unique_stations = len(set(r.station_code for r in all_records if r.station_code))
    min_year = min(years) if years else 2012
    param_dict = {p["key"]: p for p in parameters}

    return {
        "state": clean_state,
        "dataset_label": "Historical Groundwater Quality (2012–2021)",
        "source": "Kaggle — India Ground Water Quality Statewise 2012–2021",
        "disclaimer": "Historical groundwater quality data based on CPCB state-wise monitoring. Not real-time measurements.",
        "years_covered": f"{min_year} - {latest_year}",
        "year_range": {"min": min_year, "max": latest_year},
        "latest_observation_year": latest_year,
        "unique_stations_count": unique_stations,
        "total_monitoring_stations": unique_stations,
        "total_records": total_records,
        "groundwater_risk_level": gw_risk,
        "groundwater_risk_reason": gw_risk_reason,
        "groundwater_risk": {
            "level": gw_risk,
            "summary": gw_risk_reason,
            "reason": gw_risk_reason,
        },
        "parameters": parameters,
        "parameters_map": param_dict,
    }


def get_state_groundwater_trends(db: Session, state: str, parameter: str = "ph") -> List[Dict[str, Any]]:
    """
    Year-over-year trend series for a state and parameter.
    Available parameters: 'ph', 'conductivity', 'temperature'.
    """
    clean_state = state.strip().upper()
    clean_param = parameter.lower().strip()

    records = (
        db.query(GroundwaterQuality)
        .filter(GroundwaterQuality.state == clean_state)
        .order_by(GroundwaterQuality.year)
        .all()
    )

    if not records:
        return []

    # Group by year
    by_year = {}
    for r in records:
        val = None
        if clean_param == "ph":
            val = r.ph_mean
        elif clean_param in ["conductivity", "ec"]:
            val = r.conductivity_mean
        elif clean_param == "temperature":
            val = r.temp_mean

        if val is not None:
            by_year.setdefault(r.year, []).append(float(val))

    trends = []
    for y in sorted(by_year.keys()):
        vals = by_year[y]
        trends.append({
            "year": y,
            "mean": round(float(np.mean(vals)), 2 if clean_param == "ph" else 1),
            "min": round(float(np.min(vals)), 2 if clean_param == "ph" else 1),
            "max": round(float(np.max(vals)), 2 if clean_param == "ph" else 1),
            "observations_count": len(vals),
        })

    return trends
