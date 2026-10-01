import pytest
from app.services.correlation import (
    haversine_distance_km,
    calculate_bearing_deg,
    is_wind_blowing_from_source
)


def test_haversine_distance():
    # Delhi Center to Connaught Place is roughly 1.5 - 2.5 km
    d = haversine_distance_km(28.6139, 77.2090, 28.6304, 77.2177)
    assert 1.5 <= d <= 3.0

    # Distance to self is 0
    assert haversine_distance_km(28.6139, 77.2090, 28.6139, 77.2090) == 0.0


def test_bearing_calculation():
    # Directly north: lat increases, lon constant -> bearing ~0 deg
    north_bearing = calculate_bearing_deg(28.0, 77.0, 29.0, 77.0)
    assert abs(north_bearing - 0.0) < 1.0 or abs(north_bearing - 360.0) < 1.0

    # Directly east: lat constant, lon increases -> bearing ~90 deg
    east_bearing = calculate_bearing_deg(28.0, 77.0, 28.0, 78.0)
    assert abs(east_bearing - 90.0) < 2.0


def test_wind_alignment():
    # Source is south of station: source at (28.0, 77.0), station at (28.1, 77.0)
    # Bearing from source to station is ~0 deg (due North).
    # If wind is blowing from South (180 deg), wait:
    # Wind direction indicates where wind is blowing FROM.
    # If source is South of station, wind blowing FROM South (around 0 deg or 180 deg?):
    # If bearing from source to station is 0 deg (North), then wind coming FROM the source towards the station
    # originates from the source direction!
    # Our function checks: is wind_direction close to calculate_bearing_deg(source, station)?
    # Bearing from (28.0, 77.0) to (28.1, 77.0) is 0 deg.
    assert is_wind_blowing_from_source(
        wind_direction=10.0,
        source_lat=28.0,
        source_lon=77.0,
        station_lat=28.1,
        station_lon=77.0,
        tolerance_deg=45.0
    )

    # Wind blowing from opposite direction (180 deg) is not aligned
    assert not is_wind_blowing_from_source(
        wind_direction=180.0,
        source_lat=28.0,
        source_lon=77.0,
        station_lat=28.1,
        station_lon=77.0,
        tolerance_deg=45.0
    )
