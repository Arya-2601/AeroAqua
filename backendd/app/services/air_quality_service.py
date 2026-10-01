"""
Air Quality API Integration & Normalization Service for AeroAqua
Fetches live observations from OpenAQ v3 API, normalizes measurements,
and maintains fallback resilience.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
import httpx
import certifi
from ..config import settings


class AirQualityService:
    def __init__(self):
        self.api_key = settings.AIR_QUALITY_API_KEY
        self.api_url = settings.AIR_QUALITY_API_URL
        self.headers = {
            "X-API-Key": self.api_key,
            "User-Agent": "AeroAqua/1.0"
        }
        self.source_label = "Air Quality API (OpenAQ v3)"

    def fetch_live_locations_near(
        self,
        latitude: float,
        longitude: float,
        radius_m: int = 25000,
        limit: int = 6
    ) -> List[Dict[str, Any]]:
        """Fetch active monitoring locations near coordinates."""
        try:
            with httpx.Client(verify=certifi.where(), timeout=8.0) as client:
                resp = client.get(
                    f"{self.api_url}/locations",
                    headers=self.headers,
                    params={
                        "coordinates": f"{latitude},{longitude}",
                        "radius": min(radius_m, 25000),
                        "limit": limit
                    }
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("results", [])
        except Exception as e:
            print(f"[AirQualityService] Location query warning: {e}")
        return []

    def fetch_latest_measurements(self, location_id: int) -> List[Dict[str, Any]]:
        """Fetch latest measurements for an OpenAQ location."""
        try:
            with httpx.Client(verify=certifi.where(), timeout=8.0) as client:
                resp = client.get(
                    f"{self.api_url}/locations/{location_id}/latest",
                    headers=self.headers
                )
                if resp.status_code == 200:
                    return resp.json().get("results", [])
        except Exception as e:
            print(f"[AirQualityService] Latest measurements warning for location {location_id}: {e}")
        return []

    def normalize_observation(
        self,
        raw_measurement: Dict[str, Any],
        location_meta: Optional[Dict[str, Any]] = None,
        region_name: str = "Delhi"
    ) -> Dict[str, Any]:
        """
        Normalize OpenAQ measurement into internal representation:
        timestamp, region, station_id, station_name, latitude, longitude,
        parameter, value, unit, source.
        """
        param_obj = raw_measurement.get("parameter", {})
        param_name = param_obj.get("name", "unknown").lower()
        units = param_obj.get("units", "µg/m³")
        value = float(raw_measurement.get("value", 0.0))

        dt_info = raw_measurement.get("datetime", {})
        ts_utc = dt_info.get("utc") or datetime.utcnow().isoformat()

        coords = location_meta.get("coordinates", {}) if location_meta else {}
        lat = coords.get("latitude") if location_meta else None
        lon = coords.get("longitude") if location_meta else None

        st_id = location_meta.get("id") if location_meta else None
        st_name = location_meta.get("name", "Live Station") if location_meta else "Live Station"

        return {
            "parameter": param_name,
            "value": round(value, 1),
            "unit": units,
            "timestamp": ts_utc,
            "region": region_name,
            "station_id": st_id,
            "station_name": st_name,
            "latitude": lat,
            "longitude": lon,
            "source": self.source_label,
        }

    def get_live_air_quality_for_coordinates(
        self,
        latitude: float = 28.6139,
        longitude: float = 77.2090,
        region_name: str = "Delhi"
    ) -> List[Dict[str, Any]]:
        """
        Query OpenAQ locations near coordinates and return normalized observations.
        """
        locations = self.fetch_live_locations_near(latitude, longitude, radius_m=25000, limit=5)
        normalized_list = []

        for loc in locations:
            loc_id = loc.get("id")
            meas = self.fetch_latest_measurements(loc_id)
            for m in meas:
                norm = self.normalize_observation(m, location_meta=loc, region_name=region_name)
                normalized_list.append(norm)

        return normalized_list


air_quality_service = AirQualityService()
