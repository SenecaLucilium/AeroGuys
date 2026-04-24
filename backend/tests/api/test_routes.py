"""
Тесты эндпоинтов /api/routes/*.

GET /api/routes/popular
GET /api/routes/efficiency
GET /api/routes/duration-distribution
GET /api/routes/airlines
"""


class TestPopularRoutes:
    def test_returns_200_empty(self, client):
        response = client.get("/api/routes/popular")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_routes(self, client, mock_queries):
        mock_queries.get_popular_routes.return_value = [
            {"departure": "EDDF", "arrival": "EGLL", "flight_count": 25,
             "avg_duration_minutes": 90.0, "unique_aircraft": 5}
        ]
        data = client.get("/api/routes/popular").json()
        assert len(data) == 1
        assert data[0]["departure"] == "EDDF"

    def test_days_param(self, client, mock_queries):
        mock_queries.get_popular_routes.return_value = []
        client.get("/api/routes/popular?days=14&limit=10")
        mock_queries.get_popular_routes.assert_called_once_with(days=14, limit=10)

    def test_days_min_boundary(self, client, mock_queries):
        mock_queries.get_popular_routes.return_value = []
        response = client.get("/api/routes/popular?days=1")
        assert response.status_code == 200

    def test_days_max_boundary(self, client, mock_queries):
        mock_queries.get_popular_routes.return_value = []
        response = client.get("/api/routes/popular?days=90")
        assert response.status_code == 200

    def test_days_over_max_returns_422(self, client):
        response = client.get("/api/routes/popular?days=91")
        assert response.status_code == 422

    def test_limit_over_max_returns_422(self, client):
        response = client.get("/api/routes/popular?limit=101")
        assert response.status_code == 422


class TestRouteEfficiency:
    def test_returns_200_empty(self, client):
        response = client.get("/api/routes/efficiency")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_efficiency_data(self, client, mock_queries):
        mock_queries.get_route_efficiency.return_value = [
            {"departure": "EDDF", "arrival": "EGLL",
             "avg_duration_minutes": 90.0,
             "great_circle_km": 600.0,
             "efficiency_ratio": 1.12,
             "flight_count": 10}
        ]
        data = client.get("/api/routes/efficiency").json()
        assert len(data) == 1
        assert data[0]["departure"] == "EDDF"


class TestDurationDistribution:
    def test_returns_200_empty(self, client):
        response = client.get("/api/routes/duration-distribution")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_buckets(self, client, mock_queries):
        mock_queries.get_duration_distribution.return_value = [
            {"bucket": 1, "label": "0–60 мин", "min_min": 0, "max_min": 60, "count": 42}
        ]
        data = client.get("/api/routes/duration-distribution").json()
        assert len(data) == 1
        assert data[0]["count"] == 42

    def test_days_param(self, client, mock_queries):
        mock_queries.get_duration_distribution.return_value = []
        client.get("/api/routes/duration-distribution?days=30")
        mock_queries.get_duration_distribution.assert_called_once_with(days=30)


class TestTopAirlines:
    def test_returns_200_empty(self, client):
        response = client.get("/api/routes/airlines")
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_airlines(self, client, mock_queries):
        mock_queries.get_top_airlines_by_flight_count.return_value = [
            {"airline_code": "AFL", "flights": 200}
        ]
        data = client.get("/api/routes/airlines").json()
        assert len(data) == 1
        assert data[0]["airline_code"] == "AFL"

    def test_limit_param(self, client, mock_queries):
        mock_queries.get_top_airlines_by_flight_count.return_value = []
        client.get("/api/routes/airlines?limit=5")
        mock_queries.get_top_airlines_by_flight_count.assert_called_once_with(days=7, limit=5)
