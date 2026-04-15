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


# ─── Новые схемы распределений ────────────────────────────────────────────────

class SpeedBucketSchema(BaseModel):
    """Один бакет гистограммы скоростей."""
    bucket: int
    label: str
    min_kmh: int
    max_kmh: int
    count: int


class AltitudeBucketSchema(BaseModel):
    """Один бакет гистограммы высот."""
    bucket: int
    label: str
    min_m: int
    max_m: int
    count: int


class CountryCountSchema(BaseModel):
    """Страна и количество её самолётов в снапшоте."""
    country: str
    aircraft_count: int


class FlightHistorySchema(BaseModel):
    """Один исторический рейс конкретного борта."""
    icao24: str
    callsign: Optional[str] = None
    first_seen: Optional[str] = None
    last_seen: Optional[str] = None
    departure: Optional[str] = None
    arrival: Optional[str] = None
    duration_minutes: Optional[float] = None


class SnapshotStatsSchema(BaseModel):
    """Агрегированная статистика последнего снапшота."""
    total: int
    airborne: int
    on_ground: int
    max_speed_kmh: Optional[float] = None
    max_altitude_m: Optional[float] = None
    countries_count: int


class FlightPhaseSchema(BaseModel):
    """Фаза полёта (набор/снижение/горизонт) и количество ВС."""
    phase: str
    count: int
