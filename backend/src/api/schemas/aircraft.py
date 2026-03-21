"""Схемы для эндпоинтов анализа воздушных судов."""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class DailyUsageSchema(BaseModel):
    """Использование самолёта за один день."""
    date: str
    flights: int
    total_hours: float


class AircraftRouteSchema(BaseModel):
    """Один типичный маршрут конкретного борта."""
    departure: Optional[str] = None
    arrival: Optional[str] = None
    times_flown: int
    avg_duration_minutes: Optional[float] = None


class AircraftTypeSchema(BaseModel):
    """Тип ВС по категории ADS-B."""
    category: int
    category_name: str
    unique_aircraft: int
    observations: int


class AltitudeProfileSchema(BaseModel):
    """Высотно-скоростной профиль одной категории ВС."""
    category: int
    category_name: str
    avg_altitude_m: Optional[float] = None
    avg_speed_kmh: Optional[float] = None
    median_altitude_m: Optional[float] = None
    sample_aircraft: int


class ExtremeVerticalRateSchema(BaseModel):
    """Самолёт с экстремальной вертикальной скоростью."""
    icao24: str
    callsign: Optional[str] = None
    latitude: float
    longitude: float
    altitude_m: Optional[float] = None
    speed_kmh: Optional[float] = None
    vertical_rate_ms: float
    direction: str = Field(description="'climb' или 'descent'")
    last_contact: datetime
    origin_country: str
