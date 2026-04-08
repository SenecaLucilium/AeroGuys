"""
Эндпоинты экспорта данных.

GET /api/export/flights   — скачать CSV с рейсами за период
GET /api/export/raw       — скачать все сырые рейсы (полные столбцы)
GET /api/export/analytics — скачать ZIP-архив с аналитическими CSV
"""

import io
import csv
import zipfile
from datetime import datetime, date
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


@router.get(
    "/raw",
    summary="Выгрузить все сырые данные о рейсах в CSV",
    response_class=StreamingResponse,
)
def export_raw(queries: DatabaseQueries = Depends(get_queries)):
    """Скачивает все рейсы из БД со всеми столбцами (без фильтра по дате)."""
    from DB.dbManager import DatabaseManager

    db: DatabaseManager = queries.db

    sql = """
        SELECT
            icao24,
            callsign,
            TO_TIMESTAMP(first_seen)::TEXT                              AS departure_time,
            TO_TIMESTAMP(last_seen)::TEXT                               AS arrival_time,
            est_departure_airport,
            est_arrival_airport,
            ROUND((last_seen - first_seen)::NUMERIC / 60, 1)           AS duration_minutes,
            est_departure_airport_horiz_distance,
            est_departure_airport_vert_distance,
            est_arrival_airport_horiz_distance,
            est_arrival_airport_vert_distance,
            departure_airport_candidates_count,
            arrival_airport_candidates_count,
            TO_CHAR(collected_at, 'YYYY-MM-DD HH24:MI:SS')             AS collected_at
        FROM flights
        ORDER BY first_seen
    """

    with db.get_cursor() as cursor:
        cursor.execute(sql)
        rows = cursor.fetchall()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "ICAO24", "Callsign", "Departure Time", "Arrival Time",
        "From", "To", "Duration (min)",
        "Dep Horiz Dist (m)", "Dep Vert Dist (m)",
        "Arr Horiz Dist (m)", "Arr Vert Dist (m)",
        "Dep Airport Candidates", "Arr Airport Candidates",
        "Collected At",
    ])
    writer.writerows(rows)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=raw_flights.csv"},
    )


def _make_csv(headers: list, rows: list) -> str:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(headers)
    w.writerows(rows)
    return buf.getvalue()


@router.get(
    "/analytics",
    summary="Выгрузить всю аналитику в ZIP-архиве (несколько CSV)",
    response_class=StreamingResponse,
)
def export_analytics(queries: DatabaseQueries = Depends(get_queries)):
    """
    Собирает аналитические выборки из БД и упаковывает в ZIP-архив:
      • airport_statistics.csv  — трафик по аэропортам
      • top_routes.csv          — топ-маршруты
      • aircraft_activity.csv   — активность воздушных судов
      • country_distribution.csv — распределение по странам (state vectors)
    """
    from DB.dbManager import DatabaseManager

    db: DatabaseManager = queries.db
    zip_buf = io.BytesIO()

    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:

        # 1. Airport statistics
        try:
            with db.get_cursor() as cursor:
                cursor.execute("""
                    SELECT
                        COALESCE(est_departure_airport, est_arrival_airport) AS airport,
                        COUNT(*) FILTER (WHERE est_departure_airport IS NOT NULL) AS departures,
                        COUNT(*) FILTER (WHERE est_arrival_airport   IS NOT NULL) AS arrivals,
                        COUNT(*)                                                   AS total_flights
                    FROM flights
                    WHERE est_departure_airport IS NOT NULL
                       OR est_arrival_airport   IS NOT NULL
                    GROUP BY 1
                    ORDER BY total_flights DESC
                    LIMIT 500
                """)
                rows = cursor.fetchall()
            zf.writestr(
                "airport_statistics.csv",
                _make_csv(["Airport", "Departures", "Arrivals", "Total Flights"], rows),
            )
        except Exception:
            zf.writestr("airport_statistics.csv", "Airport,Departures,Arrivals,Total Flights\n")

        # 2. Top routes
        try:
            with db.get_cursor() as cursor:
                cursor.execute("""
                    SELECT
                        est_departure_airport                                       AS "From",
                        est_arrival_airport                                         AS "To",
                        COUNT(*)                                                    AS flights,
                        ROUND(AVG((last_seen - first_seen)::NUMERIC / 60), 1)      AS avg_duration_min
                    FROM flights
                    WHERE est_departure_airport IS NOT NULL
                      AND est_arrival_airport   IS NOT NULL
                    GROUP BY 1, 2
                    HAVING COUNT(*) > 1
                    ORDER BY flights DESC
                    LIMIT 1000
                """)
                rows = cursor.fetchall()
            zf.writestr(
                "top_routes.csv",
                _make_csv(["From", "To", "Flights", "Avg Duration (min)"], rows),
            )
        except Exception:
            zf.writestr("top_routes.csv", "From,To,Flights,Avg Duration (min)\n")

        # 3. Aircraft activity
        try:
            with db.get_cursor() as cursor:
                cursor.execute("""
                    SELECT
                        icao24,
                        callsign,
                        COUNT(*)                                                          AS total_flights,
                        ROUND(SUM((last_seen - first_seen)::NUMERIC / 3600), 2)          AS total_hours,
                        MIN(TO_TIMESTAMP(first_seen)::TEXT)                               AS first_seen,
                        MAX(TO_TIMESTAMP(last_seen)::TEXT)                                AS last_seen
                    FROM flights
                    GROUP BY icao24, callsign
                    ORDER BY total_flights DESC
                    LIMIT 2000
                """)
                rows = cursor.fetchall()
            zf.writestr(
                "aircraft_activity.csv",
                _make_csv(
                    ["ICAO24", "Callsign", "Total Flights", "Total Hours", "First Seen", "Last Seen"],
                    rows,
                ),
            )
        except Exception:
            zf.writestr(
                "aircraft_activity.csv",
                "ICAO24,Callsign,Total Flights,Total Hours,First Seen,Last Seen\n",
            )

        # 4. Country distribution (state vectors)
        try:
            with db.get_cursor() as cursor:
                cursor.execute("""
                    SELECT
                        origin_country,
                        COUNT(*)                AS observations,
                        COUNT(DISTINCT icao24)  AS unique_aircraft
                    FROM state_vectors
                    GROUP BY origin_country
                    ORDER BY observations DESC
                """)
                rows = cursor.fetchall()
            zf.writestr(
                "country_distribution.csv",
                _make_csv(["Country", "Observations", "Unique Aircraft"], rows),
            )
        except Exception:
            zf.writestr("country_distribution.csv", "Country,Observations,Unique Aircraft\n")

    zip_buf.seek(0)
    filename = f"aeroguys_analytics_{date.today()}.zip"
    return StreamingResponse(
        iter([zip_buf.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
