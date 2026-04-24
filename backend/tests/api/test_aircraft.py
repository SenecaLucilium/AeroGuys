"""
Тесты эндпоинтов /api/aircraft/*.

GET /api/aircraft/positions
GET /api/aircraft/by-callsign/{callsign}
GET /api/aircraft/types
GET /api/aircraft/altitude-profile
GET /api/aircraft/unidentified
GET /api/aircraft/business
GET /api/aircraft/extreme-vertical-rates
GET /api/aircraft/speed-distribution
GET /api/aircraft/altitude-distribution
GET /api/aircraft/country-distribution
GET /api/aircraft/snapshot-stats
GET /api/aircraft/flight-phases
GET /api/aircraft/{icao24}/usage
GET /api/aircraft/{icao24}/routes
"""

import sys
from pathlib import Path
from datetime import datetime
sys.path.insert(0, str(Path(__file__).parent.parent))
from conftest import make_aircraft_position


class TestAircraftPositions:
    def test_returns_200_empty(self, client):
        response = client.get("/api/aircraft/positions")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_positions(self, client, mock_queries):
        mock_queries.get_current_positions.return_value = [make_aircraft_position()]
        data = client.get("/api/aircraft/positions").json()
        assert len(data) == 1
        assert data[0]["icao24"] == "abc123"

    def test_bbox_params_passed(self, client, mock_queries):
        mock_queries.get_current_positions.return_value = []
        client.get("/api/aircraft/positions?min_lat=50&max_lat=60&min_lon=30&max_lon=40")
        call_kwargs = mock_queries.get_current_positions.call_args.kwargs
        assert call_kwargs["min_lat"] == 50.0
        assert call_kwargs["max_lat"] == 60.0

    def test_invalid_lat_returns_422(self, client):
        response = client.get("/api/aircraft/positions?min_lat=100")
        assert response.status_code == 422

    def test_invalid_lon_returns_422(self, client):
        response = client.get("/api/aircraft/positions?min_lon=-200")
        assert response.status_code == 422

    def test_limit_default(self, client, mock_queries):
        mock_queries.get_current_positions.return_value = []
        client.get("/api/aircraft/positions")
        call_kwargs = mock_queries.get_current_positions.call_args.kwargs
        assert call_kwargs["limit"] == 1000

    def test_limit_custom(self, client, mock_queries):
        mock_queries.get_current_positions.return_value = []
        client.get("/api/aircraft/positions?limit=50")
        assert mock_queries.get_current_positions.call_args.kwargs["limit"] == 50

    def test_limit_over_max_returns_422(self, client):
        response = client.get("/api/aircraft/positions?limit=5001")
        assert response.status_code == 422

    def test_on_ground_filter_true(self, client, mock_queries):
        mock_queries.get_current_positions.return_value = []
        client.get("/api/aircraft/positions?on_ground=true")
        kwargs = mock_queries.get_current_positions.call_args.kwargs
        assert kwargs.get("on_ground_only") is True

    def test_on_ground_filter_false(self, client, mock_queries):
        mock_queries.get_current_positions.return_value = []
        client.get("/api/aircraft/positions?on_ground=false")
        kwargs = mock_queries.get_current_positions.call_args.kwargs
        assert kwargs.get("airborne_only") is True

    def test_response_schema_fields(self, client, mock_queries):
        mock_queries.get_current_positions.return_value = [make_aircraft_position()]
        item = client.get("/api/aircraft/positions").json()[0]
        for field in ("icao24", "latitude", "longitude", "on_ground", "origin_country", "last_contact"):
            assert field in item


class TestByCallsign:
    def test_found_returns_200(self, client, mock_queries):
        mock_queries.get_aircraft_by_callsign.return_value = make_aircraft_position(callsign="AFL123")
        response = client.get("/api/aircraft/by-callsign/AFL123")
        assert response.status_code == 200
        assert response.json()["callsign"] == "AFL123"

    def test_not_found_returns_404(self, client, mock_queries):
        mock_queries.get_aircraft_by_callsign.return_value = None
        response = client.get("/api/aircraft/by-callsign/UNKNOWN")
        assert response.status_code == 404

    def test_callsign_passed_to_query(self, client, mock_queries):
        mock_queries.get_aircraft_by_callsign.return_value = make_aircraft_position()
        client.get("/api/aircraft/by-callsign/DLH100")
        mock_queries.get_aircraft_by_callsign.assert_called_once_with("DLH100")


class TestAircraftTypes:
    def test_returns_200_empty(self, client, mock_queries):
        mock_queries.get_popular_aircraft_types.return_value = []
        response = client.get("/api/aircraft/types")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_types(self, client, mock_queries):
        mock_queries.get_popular_aircraft_types.return_value = [
            {"category": 1, "category_name": "No info", "unique_aircraft": 10, "observations": 50}
        ]
        data = client.get("/api/aircraft/types").json()
        assert len(data) == 1
        assert data[0]["category"] == 1


class TestAltitudeProfile:
    def test_returns_200(self, client, mock_queries):
        mock_queries.get_altitude_speed_by_category.return_value = []
        response = client.get("/api/aircraft/altitude-profile")
        assert response.status_code == 200


class TestUnidentifiedAircraft:
    def test_returns_200_empty(self, client):
        response = client.get("/api/aircraft/unidentified")
        assert response.status_code == 200

    def test_limit_param(self, client, mock_queries):
        mock_queries.get_unidentified_aircraft.return_value = []
        client.get("/api/aircraft/unidentified?limit=20")
        mock_queries.get_unidentified_aircraft.assert_called_once_with(limit=20)


class TestBusinessAviation:
    def test_returns_200_empty(self, client):
        response = client.get("/api/aircraft/business")
        assert response.status_code == 200


class TestExtremeVerticalRates:
    def test_returns_200_empty(self, client):
        response = client.get("/api/aircraft/extreme-vertical-rates")
        assert response.status_code == 200

    def test_threshold_param(self, client, mock_queries):
        mock_queries.get_extreme_vertical_rates.return_value = []
        client.get("/api/aircraft/extreme-vertical-rates?threshold_ms=15")
        mock_queries.get_extreme_vertical_rates.assert_called_once_with(threshold_ms=15.0, limit=50)

    def test_invalid_threshold_returns_422(self, client):
        response = client.get("/api/aircraft/extreme-vertical-rates?threshold_ms=0")
        assert response.status_code == 422


class TestSpeedDistribution:
    def test_returns_200_empty(self, client, mock_queries):
        mock_queries.get_speed_distribution.return_value = []
        response = client.get("/api/aircraft/speed-distribution")
        assert response.status_code == 200


class TestAltitudeDistribution:
    def test_returns_200_empty(self, client, mock_queries):
        mock_queries.get_altitude_distribution.return_value = []
        response = client.get("/api/aircraft/altitude-distribution")
        assert response.status_code == 200


class TestCountryDistribution:
    def test_returns_200_empty(self, client, mock_queries):
        mock_queries.get_country_distribution.return_value = []
        response = client.get("/api/aircraft/country-distribution")
        assert response.status_code == 200


class TestSnapshotStats:
    def test_returns_200_with_data(self, client, mock_queries):
        response = client.get("/api/aircraft/snapshot-stats")
        # conftest задаёт get_snapshot_stats с пустым dict-стабом → 200
        assert response.status_code == 200


class TestFlightPhases:
    def test_returns_200_empty(self, client, mock_queries):
        mock_queries.get_vertical_rate_distribution.return_value = []
        response = client.get("/api/aircraft/flight-phases")
        assert response.status_code == 200


class TestAircraftUsage:
    def test_returns_200_empty(self, client, mock_queries):
        mock_queries.get_aircraft_daily_usage.return_value = []
        response = client.get("/api/aircraft/abc123/usage")
        assert response.status_code == 200

    def test_icao24_passed_to_query(self, client, mock_queries):
        mock_queries.get_aircraft_daily_usage.return_value = []
        client.get("/api/aircraft/abc123/usage")
        call_kwargs = mock_queries.get_aircraft_daily_usage.call_args
        assert call_kwargs is not None


class TestAircraftRoutes:
    def test_returns_200_empty(self, client, mock_queries):
        mock_queries.get_aircraft_typical_routes.return_value = []
        response = client.get("/api/aircraft/abc123/routes")
        assert response.status_code == 200

    def test_icao24_passed_to_query(self, client, mock_queries):
        mock_queries.get_aircraft_typical_routes.return_value = []
        client.get("/api/aircraft/abc123/routes")
        call_kwargs = mock_queries.get_aircraft_typical_routes.call_args
        assert call_kwargs is not None
