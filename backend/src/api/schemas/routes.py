"""Схемы для эндпоинтов анализа маршрутов."""

from typing import Optional
from pydantic import BaseModel, Field


class PopularRouteSchema(BaseModel):
    """Популярный маршрут — пара аэропортов."""
    departure: str
    arrival: str
    flight_count: int
    avg_duration_minutes: Optional[float] = None
    unique_aircraft: int


class RouteEfficiencySchema(BaseModel):
    """Эффективность маршрута относительно ортодромии."""
    departure: str
    arrival: str
    flight_count: int
    avg_duration_minutes: Optional[float] = None
    great_circle_km: float = Field(description="Кратчайшее расстояние (ортодромия), км")
    estimated_actual_km: Optional[float] = Field(None, description="Оценка фактического пути, км")
    route_efficiency_pct: Optional[float] = Field(None, description="Отношение ортодромии к факт. пути, %")


class DurationBucketSchema(BaseModel):
    """Один бакет гистограммы длительностей рейсов."""
    bucket: int
    label: str
    min_min: int
    max_min: int
    count: int


class AirlineStatSchema(BaseModel):
    """Авиакомпания и её доля рейсов за период."""
    airline_code: str
    flights: int
