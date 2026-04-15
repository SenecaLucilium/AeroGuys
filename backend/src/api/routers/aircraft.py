"""
Эндпоинты анализа воздушных судов.

GET /api/aircraft/positions              — текущие позиции (bbox-фильтр)
GET /api/aircraft/by-callsign/{callsign} — найти борт по позывному
GET /api/aircraft/types                  — популярные типы ВС в регионе
GET /api/aircraft/altitude-profile       — высотный профиль по типам ВС
GET /api/aircraft/unidentified           — военные / неопознанные борты
GET /api/aircraft/business               — бизнес-авиация
GET /api/aircraft/extreme-vertical-rates — резкие наборы/снижения высоты
GET /api/aircraft/speed-distribution     — гистограмма скоростей (снапшот)
GET /api/aircraft/altitude-distribution  — гистограмма высот (снапшот)
GET /api/aircraft/country-distribution   — топ стран (снапшот)
GET /api/aircraft/snapshot-stats         — агрегированная статистика снапшота
GET /api/aircraft/flight-phases          — фазы полёта (набор/снижение/горизонт)
GET /api/aircraft/{icao24}/usage         — ежедневный налёт конкретного борта
GET /api/aircraft/{icao24}/routes        — типичные маршруты конкретного борта
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Path, HTTPException

from api.dependencies import get_queries
from api.schemas.realtime import AircraftPositionSchema
from api.schemas.aircraft import (
    DailyUsageSchema, AircraftRouteSchema, AircraftTypeSchema,
    AltitudeProfileSchema, ExtremeVerticalRateSchema,
    SpeedBucketSchema, AltitudeBucketSchema, CountryCountSchema,
    SnapshotStatsSchema, FlightPhaseSchema, FlightHistorySchema,
)
from Analysis.queries import DatabaseQueries, AircraftPosition

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


# ---------- Текущие позиции ----------

@router.get(
    "/positions",
    response_model=List[AircraftPositionSchema],
    summary="Текущие позиции самолётов",
    description="Все борты из последнего снапшота с опциональной фильтрацией по bbox и высоте.",
)
def current_positions(
    min_lat: Optional[float] = Query(None, ge=-90, le=90),
    max_lat: Optional[float] = Query(None, ge=-90, le=90),
    min_lon: Optional[float] = Query(None, ge=-180, le=180),
    max_lon: Optional[float] = Query(None, ge=-180, le=180),
    min_altitude: Optional[float] = Query(None, ge=0, description="Минимальная высота, м"),
    on_ground: Optional[bool] = Query(None, description="true — только на земле, false — только в воздухе"),
    limit: int = Query(1000, ge=1, le=5000),
    queries: DatabaseQueries = Depends(get_queries),
):
    positions = queries.get_current_positions(
        min_lat=min_lat, max_lat=max_lat,
        min_lon=min_lon, max_lon=max_lon,
        min_altitude=min_altitude,
        on_ground_only=on_ground is True,
        airborne_only=on_ground is False,
        limit=limit,
    )
    return [_position_to_schema(p) for p in positions]


@router.get(
    "/by-callsign/{callsign}",
    response_model=AircraftPositionSchema,
    summary="Найти борт по позывному",
)
def by_callsign(
    callsign: str = Path(description="Позывной, например AFL123"),
    queries: DatabaseQueries = Depends(get_queries),
):
    result = queries.get_aircraft_by_callsign(callsign)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Борт с позывным '{callsign}' не найден в последнем снапшоте")
    return _position_to_schema(result)


# ---------- Типы и профили ----------

@router.get(
    "/types",
    response_model=List[AircraftTypeSchema],
    summary="Популярные типы ВС в регионе",
    description="Распределение воздушных судов по категориям ADS-B за последние N дней. Bbox опционален.",
)
def aircraft_types(
    days: int = Query(7, ge=1, le=30),
    min_lat: Optional[float] = Query(None, ge=-90, le=90),
    max_lat: Optional[float] = Query(None, ge=-90, le=90),
    min_lon: Optional[float] = Query(None, ge=-180, le=180),
    max_lon: Optional[float] = Query(None, ge=-180, le=180),
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_popular_aircraft_types(
        days=days, min_lat=min_lat, max_lat=max_lat, min_lon=min_lon, max_lon=max_lon,
    )
    return [AircraftTypeSchema(**r) for r in rows]


@router.get(
    "/altitude-profile",
    response_model=List[AltitudeProfileSchema],
    summary="Высотный профиль типов ВС",
    description="Средняя и медианная крейсерская высота, средняя скорость по каждой категории ADS-B.",
)
def altitude_profile(
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_altitude_speed_by_category()
    return [AltitudeProfileSchema(**r) for r in rows]


# ---------- Специальные фильтры ----------

@router.get(
    "/unidentified",
    response_model=List[AircraftPositionSchema],
    summary="Военные / неопознанные самолёты",
    description="Борты без позывного или со squawk кодами аварийных/военных ситуаций (7500/7600/7700/7777).",
)
def unidentified_aircraft(
    limit: int = Query(100, ge=1, le=500),
    queries: DatabaseQueries = Depends(get_queries),
):
    positions = queries.get_unidentified_aircraft(limit=limit)
    return [_position_to_schema(p) for p in positions]


@router.get(
    "/business",
    response_model=List[AircraftPositionSchema],
    summary="Бизнес-авиация",
    description="Борты категорий Light/Small/High-performance с нестандартными позывными (не авиакомпании).",
)
def business_aviation(
    limit: int = Query(100, ge=1, le=500),
    queries: DatabaseQueries = Depends(get_queries),
):
    positions = queries.get_business_aviation(limit=limit)
    return [_position_to_schema(p) for p in positions]


@router.get(
    "/extreme-vertical-rates",
    response_model=List[ExtremeVerticalRateSchema],
    summary="Резкие наборы и снижения высоты",
    description="Борты с вертикальной скоростью выше порога (по умолчанию ±10 м/с ≈ 2000 ft/min).",
)
def extreme_vertical_rates(
    threshold_ms: float = Query(10.0, ge=1.0, le=100.0, description="Порог вертикальной скорости, м/с"),
    limit: int = Query(50, ge=1, le=200),
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_extreme_vertical_rates(threshold_ms=threshold_ms, limit=limit)
    return [ExtremeVerticalRateSchema(**r) for r in rows]


# ---------- Новые аналитические эндпоинты ----------

@router.get(
    "/speed-distribution",
    response_model=List[SpeedBucketSchema],
    summary="Гистограмма скоростей",
    description="Распределение воздушных судов по скоростям из последнего снапшота (10 бакетов, 0–1200 км/ч).",
)
def speed_distribution(
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_speed_distribution()
    return [SpeedBucketSchema(**r) for r in rows]


@router.get(
    "/altitude-distribution",
    response_model=List[AltitudeBucketSchema],
    summary="Гистограмма высот",
    description="Распределение воздушных судов по высоте из последнего снапшота (10 бакетов, 0–15 000 м).",
)
def altitude_distribution(
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_altitude_distribution()
    return [AltitudeBucketSchema(**r) for r in rows]


@router.get(
    "/country-distribution",
    response_model=List[CountryCountSchema],
    summary="Страны воздушных судов",
    description="Топ стран по числу уникальных ВС в последнем снапшоте.",
)
def country_distribution(
    limit: int = Query(15, ge=1, le=50),
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_country_distribution(limit=limit)
    return [CountryCountSchema(**r) for r in rows]


@router.get(
    "/snapshot-stats",
    response_model=SnapshotStatsSchema,
    summary="Статистика снапшота",
    description="Агрегированные показатели последнего снапшота: всего ВС, в воздухе, на земле, макс. скорость/высота, кол-во стран.",
)
def snapshot_stats(
    queries: DatabaseQueries = Depends(get_queries),
):
    data = queries.get_snapshot_stats()
    return SnapshotStatsSchema(**data)


@router.get(
    "/flight-phases",
    response_model=List[FlightPhaseSchema],
    summary="Фазы полёта",
    description="Распределение воздушных судов по фазам полёта (набор высоты / снижение / горизонтальный полёт).",
)
def flight_phases(
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_vertical_rate_distribution()
    return [FlightPhaseSchema(**r) for r in rows]


# ---------- Конкретный борт ----------

@router.get(
    "/{icao24}/usage",
    response_model=List[DailyUsageSchema],
    summary="Использование конкретного самолёта",
    description="График налёта часов и числа рейсов по дням для выбранного борта (ICAO24).",
)
def aircraft_usage(
    icao24: str = Path(description="ICAO24 код борта, например 3c6444"),
    days: int = Query(30, ge=1, le=365),
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_aircraft_daily_usage(icao24=icao24, days=days)
    return [DailyUsageSchema(**r) for r in rows]


@router.get(
    "/{icao24}/routes",
    response_model=List[AircraftRouteSchema],
    summary="Типичные маршруты конкретного самолёта",
    description="Топ маршрутов (пар аэропортов) по числу выполненных рейсов.",
)
def aircraft_routes(
    icao24: str = Path(description="ICAO24 код борта"),
    days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_aircraft_typical_routes(icao24=icao24, days=days, limit=limit)
    return [AircraftRouteSchema(**r) for r in rows]


@router.get(
    "/{icao24}/history",
    response_model=List[FlightHistorySchema],
    summary="История полётов конкретного самолёта",
    description="Последние рейсы борта из локальной БД (только рейсы с известными аэропортами).",
)
def aircraft_history(
    icao24: str = Path(description="ICAO24 код борта, например 3c6444"),
    limit: int = Query(100, ge=1, le=500),
    queries: DatabaseQueries = Depends(get_queries),
):
    rows = queries.get_aircraft_history(icao24=icao24, limit=limit)
    return [FlightHistorySchema(**r) for r in rows]
