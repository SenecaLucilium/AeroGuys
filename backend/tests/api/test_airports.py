"""
Тесты эндпоинтов /api/airports/*.

GET /api/airports/stats
GET /api/airports/{icao}/info
GET /api/airports/{icao}/peak-hours
GET /api/airports/{icao}/destinations
GET /api/airports/{icao}/daily-trend
GET /api/airports/throughput
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from conftest import make_airport_stats


class TestAirportStats:
    def test_returns_200_empty(self, client):
        response = client.get("/api/airports/stats")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_list(self, client, mock_queries):
        mock_queries.get_airport_stats.return_value = [make_airport_stats()]
        response = client.get("/api/airports/stats")
        data = response.json()
        assert len(data) == 1
        assert data[0]["airport"] == "UUEE"

    def test_days_zero_all_time(self, client, mock_queries):
        """days=0 означает all-time; запрос передаёт None."""
        mock_queries.get_airport_stats.return_value = []
        client.get("/api/airports/stats?days=0")
        mock_queries.get_airport_stats.assert_called_once_with(days=None)

    def test_days_param_passed(self, client, mock_queries):
        mock_queries.get_airport_stats.return_value = []
        client.get("/api/airports/stats?days=14")
        mock_queries.get_airport_stats.assert_called_once_with(days=14)

    def test_invalid_days_returns_422(self, client):
        response = client.get("/api/airports/stats?days=-1")
        assert response.status_code == 422

    def test_response_schema(self, client, mock_queries):
        mock_queries.get_airport_stats.return_value = [make_airport_stats()]
        item = client.get("/api/airports/stats").json()[0]
        for field in ("airport", "departures", "arrivals", "total_flights"):
            assert field in item


class TestAirportInfo:
    def test_known_airport_returns_200(self, client, mock_queries):
        mock_queries.get_airport_info.return_value = {
            "icao": "EDDF",
            "name": "Frankfurt Airport",
            "latitude": 50.0333,
            "longitude": 8.5706,
            "country": "Germany",
            "city": "Frankfurt",
        }
        response = client.get("/api/airports/EDDF/info")
        assert response.status_code == 200
        data = response.json()
        assert data["icao"] == "EDDF"
        assert data["country"] == "Germany"

    def test_unknown_airport_returns_404(self, client, mock_queries):
        mock_queries.get_airport_info.return_value = None
        response = client.get("/api/airports/XXXX/info")
        assert response.status_code == 404

    def test_icao_too_short_returns_422(self, client):
        response = client.get("/api/airports/XX/info")
        assert response.status_code == 422

    def test_icao_too_long_returns_422(self, client):
        response = client.get("/api/airports/XXXXX/info")
        assert response.status_code == 422


class TestAirportPeakHours:
    def test_returns_200(self, client, mock_queries):
        mock_queries.get_airport_peak_hours.return_value = {
            "departure": {"8": 10, "9": 15},
            "arrival": {"8": 8, "9": 12},
        }
        response = client.get("/api/airports/EDDF/peak-hours")
        assert response.status_code == 200

    def test_response_has_airport_field(self, client, mock_queries):
        mock_queries.get_airport_peak_hours.return_value = {"departure": {}, "arrival": {}}
        data = client.get("/api/airports/EDDF/peak-hours").json()
        assert data["airport"] == "EDDF"

    def test_days_param(self, client, mock_queries):
        mock_queries.get_airport_peak_hours.return_value = {"departure": {}, "arrival": {}}
        client.get("/api/airports/EDDF/peak-hours?days=14")
        mock_queries.get_airport_peak_hours.assert_called_once_with(airport="EDDF", days=14)

    def test_invalid_days_returns_422(self, client):
        response = client.get("/api/airports/EDDF/peak-hours?days=0")
        assert response.status_code == 422


class TestAirportDestinations:
    def test_returns_200_empty(self, client, mock_queries):
        mock_queries.get_airport_destinations.return_value = []
        response = client.get("/api/airports/EDDF/destinations")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_destinations(self, client, mock_queries):
        mock_queries.get_airport_destinations.return_value = [
            {
                "destination": "UUEE",
                "country": "Russia",
                "airport_name": "Sheremetyevo",
                "latitude": 55.97,
                "longitude": 37.41,
                "flight_count": 12,
            }
        ]
        data = client.get("/api/airports/EDDF/destinations").json()
        assert len(data) == 1
        assert data[0]["destination"] == "UUEE"
        assert data[0]["flight_count"] == 12


class TestAirportDailyTrend:
    def test_returns_200_empty(self, client, mock_queries):
        mock_queries.get_airport_daily_trend.return_value = []
        response = client.get("/api/airports/EDDF/daily-trend")
        assert response.status_code == 200

    def test_returns_trend_data(self, client, mock_queries):
        mock_queries.get_airport_daily_trend.return_value = [
            {"date": "2026-04-01", "departures": 20, "arrivals": 18, "total": 38}
        ]
        data = client.get("/api/airports/EDDF/daily-trend").json()
        assert len(data) == 1


class TestAirportThroughput:
    def test_returns_200(self, client, mock_queries):
        mock_queries.get_airport_throughput.return_value = []
        response = client.get("/api/airports/throughput?airports=EDDF&airports=EGLL")
        assert response.status_code == 200
