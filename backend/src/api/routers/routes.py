"""
Эндпоинты анализа маршрутов.

GET /api/routes/popular    — топ пар аэропортов
GET /api/routes/efficiency — эффективность маршрутов vs ортодромия
"""

from typing import List
from fastapi import APIRouter, Depends, Query

from api.dependencies import get_queries
from api.schemas.routes import PopularRouteSchema, RouteEfficiencySchema
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
