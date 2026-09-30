"""
PM2.5 AQI Category and Color Mapping Service
"""

AQI_CATEGORIES = [
    {"max": 30.0, "category": "Good", "color": "#22c55e"},
    {"max": 60.0, "category": "Satisfactory", "color": "#84cc16"},
    {"max": 90.0, "category": "Moderate", "color": "#eab308"},
    {"max": 120.0, "category": "Poor", "color": "#f97316"},
    {"max": 250.0, "category": "Very Poor", "color": "#ef4444"},
    {"max": float("inf"), "category": "Severe", "color": "#7f1d1d"},
]


def get_aqi_category(pm25: float) -> str:
    """Return AQI category for a given PM2.5 reading."""
    val = round(float(pm25), 1)
    for cat in AQI_CATEGORIES:
        if val <= cat["max"]:
            return cat["category"]
    return "Severe"


def get_aqi_color(pm25: float) -> str:
    """Return hex color for a given PM2.5 reading."""
    val = round(float(pm25), 1)
    for cat in AQI_CATEGORIES:
        if val <= cat["max"]:
            return cat["color"]
    return "#7f1d1d"


def get_aqi_info(pm25: float) -> dict:
    """Return both category and color for a given PM2.5 reading."""
    val = round(float(pm25), 1)
    for cat in AQI_CATEGORIES:
        if val <= cat["max"]:
            return {"category": cat["category"], "color": cat["color"]}
    return {"category": "Severe", "color": "#7f1d1d"}
