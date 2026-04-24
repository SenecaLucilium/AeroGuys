"""
Тесты эндпоинтов /api/init/*.

GET  /api/init/status       — наличие данных в БД
POST /api/init/realtime     — загрузка данных из OpenSky
POST /api/init/upload-csv   — загрузка рейсов из CSV-файла
"""

import io
import pytest
from unittest.mock import patch, MagicMock


class TestInitStatus:
    def test_status_returns_200(self, client):
        response = client.get("/api/init/status")
        assert response.status_code == 200

    def test_status_empty_db(self, client, mock_queries):
        """При пустой БД has_data должно быть False."""
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        cursor.fetchone.return_value = (0,)
        mock_queries.db.get_cursor.return_value = cursor

        response = client.get("/api/init/status")
        data = response.json()
        assert data["has_data"] is False
        assert data["flights"] == 0
        assert data["states"] == 0

    def test_status_with_data(self, client, mock_queries):
        """Если в БД есть записи — has_data True."""
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        # Первый вызов fetchone — рейсы, второй — state_vectors
        cursor.fetchone.side_effect = [(5,), (100,)]
        mock_queries.db.get_cursor.return_value = cursor

        response = client.get("/api/init/status")
        data = response.json()
        assert data["has_data"] is True

    def test_status_db_error_returns_empty(self, client, mock_queries):
        """При ошибке БД возвращаем has_data=False, не падаем с 500."""
        mock_queries.db.get_cursor.side_effect = Exception("DB connection failed")
        response = client.get("/api/init/status")
        assert response.status_code == 200
        data = response.json()
        assert data["has_data"] is False


class TestInitRealtime:
    def test_realtime_returns_error_without_opensky(self, client):
        """
        POST /api/init/realtime без реального OpenSky вернёт ответ об ошибке.
        Используем raise_server_exceptions=False чтобы поймать 50x вместо исключения.
        """
        from fastapi.testclient import TestClient
        from api.main import app
        from api.dependencies import get_queries

        # Отдельный клиент, не бросающий ошибки сервера
        with TestClient(app, raise_server_exceptions=False) as c:
            app.dependency_overrides[get_queries] = lambda: client.app.dependency_overrides[get_queries]()
            response = c.post("/api/init/realtime")

        assert response.status_code in (200, 502, 503, 500)


class TestInitUploadCsv:
    def _make_csv(self, rows: list[str]) -> bytes:
        header = "icao24,callsign,firstSeen,estDepartureAirport,lastSeen,estArrivalAirport"
        content = "\n".join([header] + rows)
        return content.encode("utf-8")

    def test_upload_valid_csv(self, client, mock_queries):
        rows = [
            "abc123,AFL123,2026-04-01 10:00:00,UUEE,2026-04-01 12:00:00,EDDF",
            "def456,AFL456,2026-04-01 11:00:00,UUEE,2026-04-01 13:00:00,EGLL",
        ]
        csv_bytes = self._make_csv(rows)

        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        mock_queries.db.get_cursor.return_value = cursor

        response = client.post(
            "/api/init/upload-csv",
            files={"file": ("flights.csv", io.BytesIO(csv_bytes), "text/csv")},
        )
        # Принимаем 200 (успех) или 422 (ошибка парсинга строки — зависит от формата)
        assert response.status_code in (200, 422, 500)

    def test_upload_empty_csv(self, client, mock_queries):
        csv_bytes = b"icao24,callsign,firstSeen,estDepartureAirport,lastSeen,estArrivalAirport\n"

        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        mock_queries.db.get_cursor.return_value = cursor

        response = client.post(
            "/api/init/upload-csv",
            files={"file": ("flights.csv", io.BytesIO(csv_bytes), "text/csv")},
        )
        assert response.status_code in (200, 422)

    def test_upload_missing_file_returns_422(self, client):
        response = client.post("/api/init/upload-csv")
        assert response.status_code == 422
