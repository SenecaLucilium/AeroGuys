"""
Общие фикстуры для всех тестов бэкенда.

Мы используем FastAPI TestClient (httpx под капотом) и подменяем зависимость
get_queries на мок, чтобы тесты не требовали реального PostgreSQL.
"""

import sys
from pathlib import Path
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Добавляем src/ в sys.path, чтобы импорты работали без установки пакета
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from api.main import app
from api.dependencies import get_queries
from Analysis.queries import (
    DatabaseQueries, AircraftPosition, AirportStats, FlightInfo,
)


# ─── Вспомогательные фабрики ──────────────────────────────────────────────────

def make_aircraft_position(**kwargs) -> AircraftPosition:
    defaults = dict(
        icao24="abc123",
        callsign="AFL123",
        latitude=55.75,
        longitude=37.62,
        altitude=10000.0,
        speed=900.0,
        vertical_rate=0.0,
        on_ground=False,
        last_contact=datetime(2026, 4, 1, 12, 0, 0),
        origin_country="Russia",
    )
    defaults.update(kwargs)
    return AircraftPosition(**defaults)


def make_airport_stats(**kwargs) -> AirportStats:
    defaults = dict(
        airport="UUEE",
        departures=50,
        arrivals=48,
        total_flights=98,
        first_seen=datetime(2026, 4, 1, 0, 0, 0),
        last_seen=datetime(2026, 4, 1, 23, 59, 0),
    )
    defaults.update(kwargs)
    return AirportStats(**defaults)


def make_flight_info(**kwargs) -> FlightInfo:
    defaults = dict(
        id=1,
        icao24="abc123",
        callsign="AFL123",
        first_seen=datetime(2026, 4, 1, 10, 0, 0),
        last_seen=datetime(2026, 4, 1, 12, 0, 0),
        departure_airport="UUEE",
        arrival_airport="EDDF",
        duration_minutes=120.0,
    )
    defaults.update(kwargs)
    return FlightInfo(**defaults)


# ─── Mock Queries ─────────────────────────────────────────────────────────────

@pytest.fixture
def mock_queries():
    """Возвращает MagicMock, имитирующий DatabaseQueries."""
    q = MagicMock(spec=DatabaseQueries)

    # Заглушки по умолчанию — пустые списки
    q.get_current_positions.return_value = []
    q.get_aircraft_by_callsign.return_value = None
    q.get_fastest_aircraft.return_value = []
    q.get_highest_aircraft.return_value = []
    q.get_airport_busyness.return_value = []
    q.get_city_busyness.return_value = []
    q.get_airport_stats.return_value = []
    q.get_airport_info.return_value = None
    q.get_airport_peak_hours.return_value = {"departure": {}, "arrival": {}}
    q.get_airport_destinations.return_value = []
    q.get_airport_throughput.return_value = []
    q.get_airport_daily_trend.return_value = []
    q.get_popular_routes.return_value = []
    q.get_route_efficiency.return_value = []
    q.get_duration_distribution.return_value = []
    q.get_top_airlines_by_flight_count.return_value = []
    q.get_popular_aircraft_types.return_value = []
    q.get_altitude_speed_by_category.return_value = []
    q.get_unidentified_aircraft.return_value = []
    q.get_business_aviation.return_value = []
    q.get_extreme_vertical_rates.return_value = []
    q.get_speed_distribution.return_value = []
    q.get_altitude_distribution.return_value = []
    q.get_country_distribution.return_value = []
    q.get_snapshot_stats.return_value = {
        "total": 0, "airborne": 0, "on_ground": 0,
        "max_speed_kmh": None, "max_altitude_m": None,
        "countries_count": 0,
    }
    q.get_vertical_rate_distribution.return_value = []
    q.get_aircraft_daily_usage.return_value = []
    q.get_aircraft_typical_routes.return_value = []
    q.get_aircraft_history.return_value = []

    # Мок БД для init-эндпоинтов
    mock_cursor = MagicMock()
    mock_cursor.__enter__ = MagicMock(return_value=mock_cursor)
    mock_cursor.__exit__ = MagicMock(return_value=False)
    mock_cursor.fetchone.return_value = (0, 0)  # flights=0, states=0
    q.db = MagicMock()
    q.db.get_cursor.return_value = mock_cursor

    return q


@pytest.fixture
def client(mock_queries):
    """TestClient с переопределённой зависимостью get_queries."""
    app.dependency_overrides[get_queries] = lambda: mock_queries
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
