"""
Тесты эндпоинтов /api/export/*.

GET /api/export/flights    — CSV-файл с рейсами за период
GET /api/export/raw        — все сырые данные
GET /api/export/analytics  — ZIP-архив с аналитическими CSV
"""

import pytest
from unittest.mock import MagicMock, patch


class TestExportFlights:
    def test_returns_csv_response(self, client, mock_queries):
        """Эндпоинт должен возвращать CSV (Content-Type: text/csv)."""
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        cursor.fetchall.return_value = []
        mock_queries.db.get_cursor.return_value = cursor

        response = client.get(
            "/api/export/flights",
            params={"start": "2026-04-01T00:00:00", "end": "2026-04-07T23:59:59"},
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers["content-type"]

    def test_csv_has_header(self, client, mock_queries):
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        cursor.fetchall.return_value = []
        mock_queries.db.get_cursor.return_value = cursor

        response = client.get(
            "/api/export/flights",
            params={"start": "2026-04-01T00:00:00", "end": "2026-04-07T23:59:59"},
        )
        text = response.text
        assert "ICAO24" in text

    def test_csv_contains_data_rows(self, client, mock_queries):
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        cursor.fetchall.return_value = [
            ("abc123", "AFL123", "2026-04-01 10:00:00+00", "2026-04-01 12:00:00+00",
             "UUEE", "EDDF", 120.0)
        ]
        mock_queries.db.get_cursor.return_value = cursor

        response = client.get(
            "/api/export/flights",
            params={"start": "2026-04-01T00:00:00", "end": "2026-04-07T23:59:59"},
        )
        assert "abc123" in response.text
        assert "AFL123" in response.text

    def test_missing_start_returns_422(self, client):
        response = client.get("/api/export/flights", params={"end": "2026-04-07T23:59:59"})
        assert response.status_code == 422

    def test_missing_end_returns_422(self, client):
        response = client.get("/api/export/flights", params={"start": "2026-04-01T00:00:00"})
        assert response.status_code == 422

    def test_content_disposition_header(self, client, mock_queries):
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        cursor.fetchall.return_value = []
        mock_queries.db.get_cursor.return_value = cursor

        response = client.get(
            "/api/export/flights",
            params={"start": "2026-04-01T00:00:00", "end": "2026-04-07T23:59:59"},
        )
        assert "attachment" in response.headers.get("content-disposition", "")
        assert ".csv" in response.headers.get("content-disposition", "")


class TestExportRaw:
    def test_returns_csv(self, client, mock_queries):
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        cursor.fetchall.return_value = []
        cursor.description = [("icao24",), ("callsign",)]
        mock_queries.db.get_cursor.return_value = cursor

        response = client.get("/api/export/raw")
        assert response.status_code == 200

    def test_no_params_required(self, client, mock_queries):
        cursor = MagicMock()
        cursor.__enter__ = MagicMock(return_value=cursor)
        cursor.__exit__ = MagicMock(return_value=False)
        cursor.fetchall.return_value = []
        cursor.description = []
        mock_queries.db.get_cursor.return_value = cursor

        response = client.get("/api/export/raw")
        # Не должно падать с 422
        assert response.status_code != 422


class TestExportAnalytics:
    def test_returns_zip(self, client, mock_queries):
        """Эндпоинт /api/export/analytics должен возвращать ZIP-архив."""
        mock_queries.get_airport_stats.return_value = []
        mock_queries.get_popular_routes.return_value = []
        mock_queries.get_top_airlines.return_value = []

        response = client.get("/api/export/analytics")
        assert response.status_code == 200
