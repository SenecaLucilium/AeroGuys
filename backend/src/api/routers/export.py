"""
Эндпоинты экспорта данных.

GET /api/export/flights — скачать CSV с рейсами за период
"""

import io
import csv
from datetime import datetime
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse

from api.dependencies import get_queries
from Analysis.queries import DatabaseQueries

router = APIRouter()


@router.get(
    "/flights",
    summary="Экспорт рейсов в CSV",
    description="Скачивает CSV-файл со всеми рейсами за указанный период.",
    response_class=StreamingResponse,
)
def export_flights(
    start: datetime = Query(description="Начало периода, ISO-формат: 2026-03-01T00:00:00"),
    end: datetime = Query(description="Конец периода, ISO-формат: 2026-03-21T23:59:59"),
    queries: DatabaseQueries = Depends(get_queries),
):
    # Получаем данные напрямую из БД через тот же запрос, что в export_flights_to_csv,
    # но отдаём поток без записи на диск.

    from DB.dbManager import DatabaseManager

    db: DatabaseManager = queries.db

    sql = """
        SELECT
            icao24, callsign,
            TO_TIMESTAMP(first_seen)::TEXT  AS departure_time,
            TO_TIMESTAMP(last_seen)::TEXT   AS arrival_time,
            est_departure_airport,
            est_arrival_airport,
            ROUND((last_seen - first_seen)::numeric / 60, 1) AS duration_minutes
        FROM flights
        WHERE first_seen >= %s AND last_seen <= %s
        ORDER BY first_seen
    """
    params = [int(start.timestamp()), int(end.timestamp())]

    with db.get_cursor() as cursor:
        cursor.execute(sql, params)
        rows = cursor.fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ICAO24", "Callsign", "Departure Time", "Arrival Time",
                     "From", "To", "Duration (min)"])
    writer.writerows(rows)
    output.seek(0)

    filename = f"flights_{start.date()}_{end.date()}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
