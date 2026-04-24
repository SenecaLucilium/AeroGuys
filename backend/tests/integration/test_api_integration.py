"""
Интеграционные тесты — проверяют полный стек: API → БД → ответ.

Требуют запущенного PostgreSQL (docker compose up postgres).
Запуск только при наличии переменной окружения INTEGRATION_TESTS=1:
    INTEGRATION_TESTS=1 pytest backend/tests/integration/
"""

import os
import sys
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

# Пропускаем все тесты в этом модуле, если не установлена метка интеграции
pytestmark = pytest.mark.skipif(
    os.getenv("INTEGRATION_TESTS") != "1",
    reason="Integration tests require INTEGRATION_TESTS=1 and running PostgreSQL",
)


@pytest.fixture(scope="module")
def db_manager():
    """Создаём реальный DatabaseManager; пропускаем, если DB недоступна."""
    from DB.dbManager import DatabaseManager

    try:
        manager = DatabaseManager()
        yield manager
        manager.close_all_connections()
    except Exception as e:
        pytest.skip(f"Cannot connect to PostgreSQL: {e}")


@pytest.fixture(scope="module")
def schema_initialized(db_manager):
    """Инициализируем схему БД и очищаем данные тестов."""
    from DB.schema import init_schema, drop_all
    drop_all(db_manager)
    init_schema(db_manager)
    yield
    drop_all(db_manager)


@pytest.fixture(scope="module")
def queries(db_manager, schema_initialized):
    from Analysis.queries import DatabaseQueries
    return DatabaseQueries(db_manager)


@pytest.fixture(scope="module")
def integration_client(queries):
    """FastAPI TestClient с реальной БД."""
    from fastapi.testclient import TestClient
    from api.main import app
    from api.dependencies import get_queries

    app.dependency_overrides[get_queries] = lambda: queries
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ─────────────────────── Тесты ────────────────────────────────────────────────

class TestHealthIntegration:
    def test_health_endpoint(self, integration_client):
        response = integration_client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestInitStatusIntegration:
    def test_status_empty_db(self, integration_client):
        response = integration_client.get("/api/init/status")
        assert response.status_code == 200
        data = response.json()
        assert data["has_data"] is False
        assert data["flights"] == 0
        assert data["states"] == 0


class TestAircraftPositionsIntegration:
    def test_positions_empty_on_empty_db(self, integration_client):
        response = integration_client.get("/api/aircraft/positions")
        assert response.status_code == 200
        assert response.json() == []

    def test_positions_after_insert(self, integration_client, db_manager):
        """Вставляем тестовые данные и проверяем, что они видны через API."""
        # Вставляем снапшот
        with db_manager.get_cursor() as cur:
            cur.execute(
                """
                INSERT INTO snapshots (api_timestamp, aircraft_count)
                VALUES (%s, %s)
                RETURNING id
                """,
                (1743508800, 1),
            )
            snap_id = cur.fetchone()[0]

            cur.execute(
                """
                INSERT INTO state_vectors
                  (snapshot_id, icao24, callsign, origin_country, last_contact,
                   longitude, latitude, baro_altitude, on_ground, velocity,
                   vertical_rate, position_source, category)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (snap_id, "abc123", "AFL123", "Russia", 1743508800,
                 37.62, 55.75, 10000.0, False, 250.0, 0.0, 0, 1),
            )

        response = integration_client.get("/api/aircraft/positions")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        icaos = [d["icao24"] for d in data]
        assert "abc123" in icaos


class TestAirportStatsIntegration:
    def test_airport_stats_empty(self, integration_client):
        response = integration_client.get("/api/airports/stats")
        assert response.status_code == 200
        # Данных нет — пустой список
        assert isinstance(response.json(), list)


class TestExportIntegration:
    def test_export_flights_csv_empty(self, integration_client):
        response = integration_client.get(
            "/api/export/flights",
            params={"start": "2026-01-01T00:00:00", "end": "2026-12-31T23:59:59"},
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]
        assert "ICAO24" in response.text  # заголовок всегда присутствует


class TestOpenAPISchemaIntegration:
    def test_openapi_lists_all_routers(self, integration_client):
        schema = integration_client.get("/api/openapi.json").json()
        paths = schema["paths"]
        # Проверяем, что все основные роуты присутствуют в схеме
        assert "/api/health" in paths
        assert "/api/init/status" in paths
        assert "/api/aircraft/positions" in paths
        assert "/api/airports/stats" in paths
        assert "/api/routes/popular" in paths
        assert "/api/export/flights" in paths
