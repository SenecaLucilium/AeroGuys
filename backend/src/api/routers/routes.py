"""
Эндпоинты анализа маршрутов.

GET /api/routes/popular                — топ пар аэропортов
GET /api/routes/efficiency             — эффективность маршрутов vs ортодромия
GET /api/routes/duration-distribution  — гистограмма длительностей рейсов
GET /api/routes/airlines               — топ авиакомпаний по числу рейсов
"""

from typing import List
from fastapi import APIRouter, Depends, Query

from api.dependencies import get_queries
from api.schemas.routes import (
    PopularRouteSchema, RouteEfficiencySchema,
    DurationBucketSchema, AirlineStatSchema,
)
from Analysis.queries import DatabaseQueries

router = APIRouter()


@router.get(
    "/popular",
    response_model=List[PopularRouteSchema],
    summary="Популярные маршруты",
    description="Самые частотные пары аэропортов (маршруты) за выбранный период.",
)
def popular_routes(
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(20, ge=1, le=100),
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_popular_routes(days=days, limit=limit)
    return [PopularRouteSchema(**r) for r in rows]


@router.get(
    "/efficiency",
    response_model=List[RouteEfficiencySchema],
    summary="Эффективность маршрутов",
    description=(
        "Сравнение фактической длительности рейса с теоретической ортодромией. "
        "Требует заполненной таблицы airports (страна, координаты)."
    ),
)
def route_efficiency(
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(20, ge=1, le=100),
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_route_efficiency(days=days, limit=limit)
    return [RouteEfficiencySchema(**r) for r in rows]


@router.get(
    "/duration-distribution",
    response_model=List[DurationBucketSchema],
    summary="Гистограмма длительностей рейсов",
    description="Распределение рейсов по длительности за период (12 бакетов по 60 мин, диапазон 0–720 мин).",
)
def duration_distribution(
    days: int = Query(7, ge=1, le=90),
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_duration_distribution(days=days)
    return [DurationBucketSchema(**r) for r in rows]


@router.get(
    "/airlines",
    response_model=List[AirlineStatSchema],
    summary="Топ авиакомпаний по числу рейсов",
    description="Топ авиакомпаний (по коду ICAO из позывного) за выбранный период.",
)
def top_airlines(
    days: int = Query(7, ge=1, le=90),
    limit: int = Query(15, ge=1, le=50),
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_top_airlines_by_flight_count(days=days, limit=limit)
    return [AirlineStatSchema(**r) for r in rows]
