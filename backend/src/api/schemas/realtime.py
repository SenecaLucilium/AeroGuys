"""Схемы для эндпоинтов мониторинга в реальном времени."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class AircraftPositionSchema(BaseModel):
    """Текущая позиция воздушного судна."""
    icao24: str
    callsign: Optional[str] = None
    latitude: float
    longitude: float
    altitude_m: Optional[float] = Field(None, description="Барометрическая высота, м")
    speed_kmh: Optional[float] = Field(None, description="Скорость, км/ч")
    vertical_rate_ms: Optional[float] = Field(None, description="Вертикальная скорость, м/с")
    on_ground: bool
    last_contact: datetime
    origin_country: str


class AirportBusynessSchema(BaseModel):
    """Загруженность одного аэропорта."""
    airport: str
    departures: int
    arrivals: int
    total_flights: int
    first_seen: datetime
    last_seen: datetime


class CityBusynessSchema(BaseModel):
    """Загруженность города (агрегация аэропортов)."""
    city: str
    country: str
    departures: int
    arrivals: int
    total_flights: int
    first_seen: datetime
    last_seen: datetime
