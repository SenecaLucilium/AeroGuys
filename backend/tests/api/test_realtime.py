"""
Тесты эндпоинтов /api/realtime/*.

GET /api/realtime/airport-busyness
GET /api/realtime/city-busyness
GET /api/realtime/fastest
GET /api/realtime/highest
"""

import pytest
from datetime import datetime

# conftest.py предоставляет фикстуры client, mock_queries, make_aircraft_position,
# make_airport_stats через sys.path + conftest import.
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from conftest import make_aircraft_position, make_airport_stats


class TestAirportBusyness:
    def test_returns_200_empty(self, client):
        response = client.get("/api/realtime/airport-busyness")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_list_with_data(self, client, mock_queries):
        mock_queries.get_airport_busyness.return_value = [make_airport_stats()]
        response = client.get("/api/realtime/airport-busyness")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["airport"] == "UUEE"
        assert data[0]["total_flights"] == 98

    def test_hours_back_param(self, client, mock_queries):
        mock_queries.get_airport_busyness.return_value = []
        response = client.get("/api/realtime/airport-busyness?hours_back=48&limit=10")
        assert response.status_code == 200
        mock_queries.get_airport_busyness.assert_called_once_with(hours_back=48, limit=10)

    def test_invalid_hours_back_returns_422(self, client):
        response = client.get("/api/realtime/airport-busyness?hours_back=0")
        assert response.status_code == 422

    def test_hours_back_max_boundary(self, client, mock_queries):
        mock_queries.get_airport_busyness.return_value = []
        response = client.get("/api/realtime/airport-busyness?hours_back=168")
        assert response.status_code == 200

    def test_hours_back_over_max_returns_422(self, client):
        response = client.get("/api/realtime/airport-busyness?hours_back=169")
        assert response.status_code == 422

    def test_response_schema_fields(self, client, mock_queries):
        mock_queries.get_airport_busyness.return_value = [make_airport_stats()]
        data = client.get("/api/realtime/airport-busyness").json()
        item = data[0]
        for field in ("airport", "departures", "arrivals", "total_flights", "first_seen", "last_seen"):
            assert field in item, f"Missing field: {field}"


class TestCityBusyness:
    def test_returns_200_empty(self, client):
        response = client.get("/api/realtime/city-busyness")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_list_with_data(self, client, mock_queries):
        mock_queries.get_city_busyness.return_value = [
            {"city": "Moscow", "country": "Russia", "departures": 100,
             "arrivals": 95, "total_flights": 195,
             "first_seen": "2026-04-01T00:00:00", "last_seen": "2026-04-01T23:59:00"}
        ]
        response = client.get("/api/realtime/city-busyness")
        data = response.json()
        assert len(data) == 1
        assert data[0]["city"] == "Moscow"


class TestFastestAircraft:
    def test_returns_200_empty(self, client):
        response = client.get("/api/realtime/fastest")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_positions(self, client, mock_queries):
        pos = make_aircraft_position(speed=1200.0)
        mock_queries.get_fastest_aircraft.return_value = [pos]
        response = client.get("/api/realtime/fastest")
        data = response.json()
        assert len(data) == 1
        assert data[0]["icao24"] == "abc123"
        assert data[0]["speed_kmh"] == 1200.0

    def test_limit_param(self, client, mock_queries):
        mock_queries.get_fastest_aircraft.return_value = []
        response = client.get("/api/realtime/fastest?limit=5")
        assert response.status_code == 200
        mock_queries.get_fastest_aircraft.assert_called_once_with(limit=5)

    def test_limit_over_max_returns_422(self, client):
        response = client.get("/api/realtime/fastest?limit=201")
        assert response.status_code == 422

    def test_response_has_required_fields(self, client, mock_queries):
        mock_queries.get_fastest_aircraft.return_value = [make_aircraft_position()]
        data = client.get("/api/realtime/fastest").json()[0]
        for field in ("icao24", "latitude", "longitude", "on_ground", "last_contact", "origin_country"):
            assert field in data


class TestHighestAircraft:
    def test_returns_200_empty(self, client):
        response = client.get("/api/realtime/highest")
        assert response.status_code == 200

    def test_returns_positions(self, client, mock_queries):
        pos = make_aircraft_position(altitude=12500.0)
        mock_queries.get_highest_aircraft.return_value = [pos]
        data = client.get("/api/realtime/highest").json()
        assert data[0]["altitude_m"] == 12500.0

    def test_limit_param(self, client, mock_queries):
        mock_queries.get_highest_aircraft.return_value = []
        response = client.get("/api/realtime/highest?limit=50")
        assert response.status_code == 200
        mock_queries.get_highest_aircraft.assert_called_once_with(limit=50)
