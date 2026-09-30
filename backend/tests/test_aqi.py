import pytest
from app.services.aqi import get_aqi_category, get_aqi_color, get_aqi_info


def test_aqi_boundaries():
    # 0 - 30 Good
    assert get_aqi_category(0) == "Good"
    assert get_aqi_category(30) == "Good"
    assert get_aqi_category(30.0) == "Good"
    assert get_aqi_color(30) == "#22c55e"

    # 31 - 60 Satisfactory
    assert get_aqi_category(31) == "Satisfactory"
    assert get_aqi_category(60) == "Satisfactory"
    assert get_aqi_color(45) == "#84cc16"

    # 61 - 90 Moderate
    assert get_aqi_category(61) == "Moderate"
    assert get_aqi_category(90) == "Moderate"
    assert get_aqi_color(75) == "#eab308"

    # 91 - 120 Poor
    assert get_aqi_category(91) == "Poor"
    assert get_aqi_category(120) == "Poor"
    assert get_aqi_color(110) == "#f97316"

    # 121 - 250 Very Poor
    assert get_aqi_category(121) == "Very Poor"
    assert get_aqi_category(250) == "Very Poor"
    assert get_aqi_color(180) == "#ef4444"

    # 251+ Severe
    assert get_aqi_category(251) == "Severe"
    assert get_aqi_category(400) == "Severe"
    assert get_aqi_color(300) == "#7f1d1d"


def test_aqi_info():
    info = get_aqi_info(150)
    assert info["category"] == "Very Poor"
    assert info["color"] == "#ef4444"
