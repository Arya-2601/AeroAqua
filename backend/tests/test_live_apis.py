import pytest
from app.services.air_quality_service import air_quality_service
from app.services.weather_service import weather_service


def test_weather_service_live():
    # Test Delhi coordinates
    w = weather_service.get_live_weather(28.6139, 77.2090)
    assert "temperature" in w
    assert "wind_speed" in w
    assert "wind_direction" in w
    assert "source" in w
    assert "Open-Meteo" in w["source"]
    # Check non-causal language in notes
    assert "caused by" not in w["context_note"].lower()


def test_air_quality_service_normalization():
    raw = {
        "parameter": {"name": "pm25", "units": "µg/m³"},
        "value": 142.5,
        "datetime": {"utc": "2026-09-30T15:00:00Z"}
    }
    loc = {
        "id": 101,
        "name": "Anand Vihar, Delhi - DPCC",
        "coordinates": {"latitude": 28.6468, "longitude": 77.3160}
    }
    norm = air_quality_service.normalize_observation(raw, location_meta=loc, region_name="Delhi")
    assert norm["parameter"] == "pm25"
    assert norm["value"] == 142.5
    assert norm["station_id"] == 101
    assert norm["source"] == "Air Quality API (OpenAQ v3)"
    assert norm["region"] == "Delhi"
