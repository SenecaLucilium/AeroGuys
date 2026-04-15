"""
Эндпоинты анализа аэропортов.

GET /api/airports/stats                  — рейтинг аэропортов за период (days=0 — all-time)
GET /api/airports/{icao}/info            — гео-информация об аэропорте из справочника
GET /api/airports/{icao}/peak-hours      — пиковые часы конкретного аэропорта
GET /api/airports/{icao}/destinations    — направления (куда летят из аэропорта)
GET /api/airports/{icao}/daily-trend     — ежедневная динамика рейсов через аэропорт
GET /api/airports/throughput             — пропускная способность (несколько аэропортов)
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path, HTTPException

from api.dependencies import get_queries
from api.schemas.airports import (
    AirportStatsSchema, PeakHoursSchema, DestinationSchema, ThroughputSchema,
    DailyTrendSchema, AirportInfoSchema,
)
from Analysis.queries import DatabaseQueries, AirportStats

router = APIRouter()


def _stats_to_schema(s: AirportStats) -> AirportStatsSchema:
    return AirportStatsSchema(
        airport=s.airport,
        departures=s.departures,
        arrivals=s.arrivals,
        total_flights=s.total_flights,
        first_seen=s.first_seen,
        last_seen=s.last_seen,
    )


@router.get(
    "/stats",
    response_model=List[AirportStatsSchema],
    summary="Рейтинг аэропортов по загруженности",
    description="Статистика всех аэропортов. days=0 — весь доступный снапшот (all-time).",
)
def airport_stats(
    days: int = Query(0, ge=0, le=3650),
    queries: DatabaseQueries = Depends(get_queries),
):
    return [_stats_to_schema(s) for s in queries.get_airport_stats(days=days or None)]


@router.get(
    "/{icao}/info",
    response_model=AirportInfoSchema,
    summary="Гео-информация об аэропорте",
    description="Координаты, страна и город из справочника аэропортов.",
)
def airport_info(
    icao: str = Path(description="ICAO-код аэропорта, например EDDF", min_length=3, max_length=4),
    queries: DatabaseQueries = Depends(get_queries),
):
    data = queries.get_airport_info(icao)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Аэропорт '{icao.upper()}' не найден в справочнике")
    return AirportInfoSchema(**data)


@router.get(
    "/{icao}/peak-hours",
    response_model=PeakHoursSchema,
    summary="Пиковые часы аэропорта",
    description="Почасовое распределение вылетов и прилётов для выбранного аэропорта.",
)
def airport_peak_hours(
    icao: str = Path(description="ICAO-код аэропорта, например EDDF", min_length=4, max_length=4),
    days: int = Query(7, ge=1, le=90),
    queries: DatabaseQueries = Depends(get_queries),
):
    data = queries.get_airport_peak_hours(airport=icao, days=days)
    return PeakHoursSchema(airport=icao.upper(), days=days, **data)


@router.get(
    "/{icao}/destinations",
    response_model=List[DestinationSchema],
    summary="География направлений из аэропорта",
    description="Куда и сколько раз летели самолёты из данного аэропорта за период.",
)
def airport_destinations(
    icao: str = Path(description="ICAO-код аэропорта отправления", min_length=4, max_length=4),
    days: int = Query(7, ge=1, le=90),
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_airport_destinations(airport=icao, days=days)
    return [DestinationSchema(**r) for r in rows]


@router.get(
    "/{icao}/daily-trend",
    response_model=List[DailyTrendSchema],
    summary="Ежедневная динамика рейсов через аэропорт",
    description="Количество вылетов, прилётов и суммарное число рейсов по дням за период.",
)
def airport_daily_trend(
    icao: str = Path(description="ICAO-код аэропорта, например EDDF", min_length=4, max_length=4),
    days: int = Query(14, ge=1, le=90),
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_airport_daily_trend(airport=icao, days=days)
    return [DailyTrendSchema(**r) for r in rows]


@router.get(
    "/throughput",
    response_model=List[ThroughputSchema],
    summary="Пропускная способность аэропортов",
    description=(
        "Среднее число рейсов в час для указанных аэропортов. "
        "Передайте несколько значений параметра `airports` для сравнения."
    ),
)
def airport_throughput(
    airports: List[str] = Query(description="ICAO-коды аэропортов, например: airports=EDDF&airports=LFPG"),
    days: int = Query(7, ge=1, le=90),
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_airport_throughput(airports=airports, days=days)
    return [ThroughputSchema(**r) for r in rows]