"""Тесты служебных эндпоинтов: /api/health."""

import pytest


class TestHealthCheck:
    def test_health_returns_200(self, client):
        response = client.get("/api/health")
        assert response.status_code == 200

    def test_health_returns_ok_status(self, client):
        response = client.get("/api/health")
        assert response.json() == {"status": "ok"}

    def test_health_content_type_is_json(self, client):
        response = client.get("/api/health")
        assert "application/json" in response.headers["content-type"]

    def test_unknown_route_returns_404(self, client):
        response = client.get("/api/nonexistent")
        assert response.status_code == 404

    def test_openapi_schema_available(self, client):
        response = client.get("/api/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert schema["info"]["title"] == "AeroGuys API"

    def test_swagger_docs_available(self, client):
        response = client.get("/api/docs")
        assert response.status_code == 200
