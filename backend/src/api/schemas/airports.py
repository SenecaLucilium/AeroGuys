"""Схемы для эндпоинтов анализа аэропортов."""

from datetime import datetime
from typing import Optional, Dict, List
from pydantic import BaseModel, Field


class PeakHoursSchema(BaseModel):
    """Пиковые часы аэропорта: распределение по часам суток."""
    airport: str
    days: int
    departure: Dict[int, int] = Field(description="час 0-23 → количество вылетов")
    arrival: Dict[int, int] = Field(description="час 0-23 → количество прилётов")


class DestinationSchema(BaseModel):
    """Одно направление из аэропорта."""
    destination: str
    country: Optional[str] = None
    airport_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    flight_count: int


class ThroughputSchema(BaseModel):
    """Пропускная способность одного аэропорта."""
    airport: str
    total_flights: int
    departures: int
    arrivals: int
    avg_flights_per_hour: float


class AirportStatsSchema(BaseModel):
    """Общая статистика аэропорта за период."""
    airport: str
    departures: int
    arrivals: int
    total_flights: int
    first_seen: datetime
    last_seen: datetime
