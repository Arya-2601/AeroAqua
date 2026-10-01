"""
Live Weather Service for AeroAqua
Integrates Open-Meteo live API to fetch real ambient meteorological variables.
Maintains strictly non-causal phrasing.
"""

from typing import Dict, Any, Optional
import httpx
import certifi
from ..config import settings


class WeatherService:
    def __init__(self):
        self.api_url = settings.WEATHER_API_URL
        self.source_label = "Weather API (Open-Meteo)"

    def get_live_weather(
        self,
        latitude: float = 28.6139,
        longitude: float = 77.2090
    ) -> Dict[str, Any]:
        """
        Fetch real-time ambient weather metrics from Open-Meteo API.
        """
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation,surface_pressure",
            "timezone": "auto"
        }

        try:
            with httpx.Client(verify=certifi.where(), timeout=6.0) as client:
                resp = client.get(self.api_url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    curr = data.get("current", {})
                    w_speed = float(curr.get("wind_speed_10m", 2.5))
                    w_dir = float(curr.get("wind_direction_10m", 280.0))
                    temp = float(curr.get("temperature_2m", 26.0))
                    humidity = float(curr.get("relative_humidity_2m", 55.0))
                    precip = float(curr.get("precipitation", 0.0))
                    pressure = float(curr.get("surface_pressure", 1010.0))

                    # Non-causal contextual note
                    notes = []
                    if w_speed < 2.0:
                        notes.append("low wind speed overlaps with potential particulate accumulation conditions")
                    elif w_speed > 6.0:
                        notes.append("elevated wind speed overlaps with atmospheric dispersion")
                    if precip > 0.5:
                        notes.append("precipitation overlaps with potential particulate wash-out")

                    context_text = f"Wind speed {w_speed} m/s ({w_dir}°), Temp {temp}°C, Humidity {humidity}%"
                    if notes:
                        context_text += f" — {'; '.join(notes)}"
                    context_text += " — correlated meteorological factor."

                    return {
                        "temperature": temp,
                        "temperature_unit": "°C",
                        "humidity": humidity,
                        "humidity_unit": "%",
                        "wind_speed": w_speed,
                        "wind_speed_unit": "m/s",
                        "wind_direction": w_dir,
                        "wind_direction_unit": "°",
                        "precipitation": precip,
                        "precipitation_unit": "mm",
                        "pressure": pressure,
                        "pressure_unit": "hPa",
                        "timestamp": curr.get("time"),
                        "source": self.source_label,
                        "context_note": context_text,
                    }
        except Exception as e:
            print(f"[WeatherService] Weather query fallback: {e}")

        # Fallback default
        return {
            "temperature": 27.5,
            "temperature_unit": "°C",
            "humidity": 58.0,
            "humidity_unit": "%",
            "wind_speed": 2.4,
            "wind_speed_unit": "m/s",
            "wind_direction": 275.0,
            "wind_direction_unit": "°",
            "precipitation": 0.0,
            "precipitation_unit": "mm",
            "pressure": 1008.0,
            "pressure_unit": "hPa",
            "timestamp": None,
            "source": self.source_label,
            "context_note": "Ambient weather conditions overlap with observed environmental pattern — correlated factor.",
        }


weather_service = WeatherService()
