"""
Эндпоинты мониторинга в реальном времени.

GET /api/realtime/airport-busyness  — рейтинг загруженности аэропортов
GET /api/realtime/fastest           — рейтинг самых быстрых самолётов
GET /api/realtime/highest           — рейтинг самолётов по высоте полёта
"""

from typing import List
from fastapi import APIRouter, Depends, Query

from api.dependencies import get_queries
from api.schemas.realtime import AircraftPositionSchema, AirportBusynessSchema
from Analysis.queries import DatabaseQueries, AircraftPosition, AirportStats

router = APIRouter()


def _position_to_schema(p: AircraftPosition) -> AircraftPositionSchema:
    return AircraftPositionSchema(
        icao24=p.icao24,
        callsign=p.callsign,
        latitude=p.latitude,
        longitude=p.longitude,
        altitude_m=p.altitude,
        speed_kmh=p.speed,
        vertical_rate_ms=p.vertical_rate,
        on_ground=p.on_ground,
        last_contact=p.last_contact,
        origin_country=p.origin_country,
    )


def _airport_stats_to_schema(s: AirportStats) -> AirportBusynessSchema:
    return AirportBusynessSchema(
        airport=s.airport,
        departures=s.departures,
        arrivals=s.arrivals,
        total_flights=s.total_flights,
        first_seen=s.first_seen,
        last_seen=s.last_seen,
    )


@router.get(
    "/airport-busyness",
    response_model=List[AirportBusynessSchema],
    summary="Рейтинг загруженности аэропортов",
    description="Аэропорты, отсортированные по суммарному числу рейсов за последние N часов.",
)
def airport_busyness(
    hours_back: int = Query(24, ge=1, le=168, description="Глубина выборки в часах (макс 7 дней)"),
    limit: int = Query(20, ge=1, le=100),
    queries: DatabaseQueries = Depends(get_queries),
):
    stats = queries.get_airport_busyness(hours_back=hours_back, limit=limit)
    return [_airport_stats_to_schema(s) for s in stats]


@router.get(
    "/fastest",
    response_model=List[AircraftPositionSchema],
    summary="Рейтинг самых быстрых самолётов",
    description="Топ воздушных судов по скорости из последнего снапшота (только в воздухе).",
)
def fastest_aircraft(
    limit: int = Query(20, ge=1, le=200),
    queries: DatabaseQueries = Depends(get_queries),
):
    positions = queries.get_fastest_aircraft(limit=limit)
    return [_position_to_schema(p) for p in positions]


@router.get(
    "/highest",
    response_model=List[AircraftPositionSchema],
    summary="Рейтинг самых высоких полётов",
    description="Топ воздушных судов по барометрической высоте из последнего снапшота.",
)
def highest_aircraft(
    limit: int = Query(20, ge=1, le=200),
    queries: DatabaseQueries = Depends(get_queries),
):
    positions = queries.get_highest_aircraft(limit=limit)
    return [_position_to_schema(p) for p in positions]
