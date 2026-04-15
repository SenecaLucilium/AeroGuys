"""
Эндпоинты инициализации данных.

POST /api/init/realtime   — загрузить актуальные данные из OpenSky API
POST /api/init/upload-csv — загрузить рейсы из пользовательского CSV-файла
"""

import io
import csv
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from pydantic import BaseModel

from api.dependencies import get_queries
from Analysis.queries import DatabaseQueries

logger = logging.getLogger(__name__)

router = APIRouter()


class InitResult(BaseModel):
    states_loaded: int = 0
    flights_loaded: int = 0
    message: str


class DataStatus(BaseModel):
    has_data: bool
    flights: int
    states: int


@router.get(
    "/status",
    summary="Проверить наличие данных в БД",
    response_model=DataStatus,
)
def init_status(queries: DatabaseQueries = Depends(get_queries)) -> DataStatus:
    """Возвращает, есть ли в базе загруженные данные."""
    try:
        with queries.db.get_cursor() as cursor:
            cursor.execute("SELECT COUNT(*) FROM flights")
            flights: int = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM state_vectors")
            states: int = cursor.fetchone()[0]
        return DataStatus(has_data=(flights > 0 or states > 0), flights=flights, states=states)
    except Exception:
        return DataStatus(has_data=False, flights=0, states=0)


# ─── helpers ─────────────────────────────────────────────────────────────────

def _parse_ts(s: str) -> int:
    """Парсит строку с датой/временем в Unix-timestamp (секунды)."""
    s = s.strip()
    # PostgreSQL TO_TIMESTAMP может отдавать "+00" без двоеточия
    for fmt in (
        "%Y-%m-%d %H:%M:%S+00",
        "%Y-%m-%d %H:%M:%S+0000",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S.%f",
    ):
        try:
            return int(datetime.strptime(s, fmt).timestamp())
        except ValueError:
            pass
    # fromisoformat принимает "+00:00" и похожие форматы
    return int(datetime.fromisoformat(s).timestamp())


# ─── endpoints ───────────────────────────────────────────────────────────────

@router.post(
    "/realtime",
    summary="Загрузить real-time данные из OpenSky API",
    response_model=InitResult,
)
def init_realtime(queries: DatabaseQueries = Depends(get_queries)) -> InitResult:
    """
    Выполняет один цикл сбора данных из OpenSky Network:
    state vectors (текущие позиции) + рейсы за последние 2 часа.
    """
    try:
        # Импорты выполняются лениво, т.к. tokenManager бросает ValueError
        # при отсутствии переменных окружения OPENSKY_CLIENT_ID / CLIENT_SECRET
        from OpenskyAPI.tokenManager import TokenManager
        from parsing.data_collector import DataCollector
        from parsing.default_configs import get_full_world_config
    except (ValueError, ImportError) as exc:
        raise HTTPException(
            status_code=503,
            detail=f"OpenSky API credentials not configured: {exc}",
        )

    config = get_full_world_config()
    try:
        token_manager = TokenManager()
        collector = DataCollector(queries.db, token_manager, config)
        stats = collector.run_poll()
    except Exception as exc:
        logger.error("Realtime poll failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=502,
            detail=f"Ошибка при запросе к OpenSky API: {exc}",
        )

    return InitResult(
        states_loaded=stats.get("states_collected", 0),
        flights_loaded=stats.get("flights_collected", 0),
        message=(
            f"Загружено: {stats.get('states_collected', 0):,} позиций, "
            f"{stats.get('flights_collected', 0):,} рейсов"
        ),
    )


@router.post(
    "/upload-csv",
    summary="Загрузить рейсы из CSV-файла",
    response_model=InitResult,
)
async def init_upload_csv(
    file: UploadFile = File(...),
    queries: DatabaseQueries = Depends(get_queries),
) -> InitResult:
    """
    Принимает CSV с заголовком (регистр не важен):
      ICAO24, Callsign, Departure Time, Arrival Time, From, To, Duration (min)

    Дубликаты пропускаются автоматически (ON CONFLICT DO NOTHING).
    """
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Файл должен иметь расширение .csv")

    content = await file.read()
    # Пробуем utf-8-sig (BOM), потом latin-1 как fallback
    try:
        text = content.decode("utf-8-sig", errors="replace")
    except Exception:
        text = content.decode("latin-1", errors="replace")

    reader = csv.DictReader(io.StringIO(text))

    from parsing.storage import DataStorage
    from OpenskyAPI.models import FlightData

    storage = DataStorage(queries.db)
    flights: list[FlightData] = []

    for row in reader:
        try:
            icao24 = (row.get("ICAO24") or row.get("icao24") or "").strip()
            if not icao24:
                continue

            dep_str = (row.get("Departure Time") or "").strip()
            arr_str = (row.get("Arrival Time") or "").strip()
            if not dep_str or not arr_str:
                continue

            first_seen = _parse_ts(dep_str)
            last_seen = _parse_ts(arr_str)

            callsign = (row.get("Callsign") or "").strip() or None
            from_airport = (row.get("From") or "").strip() or None
            to_airport = (row.get("To") or "").strip() or None

            flights.append(
                FlightData(
                    icao24=icao24,
                    callsign=callsign,
                    first_seen=first_seen,
                    last_seen=last_seen,
                    est_departure_airport=from_airport,
                    est_arrival_airport=to_airport,
                    est_departure_airport_horiz_distance=None,
                    est_departure_airport_vert_distance=None,
                    est_arrival_airport_horiz_distance=None,
                    est_arrival_airport_vert_distance=None,
                    departure_airport_candidates_count=None,
                    arrival_airport_candidates_count=None,
                )
            )
        except Exception as exc:
            logger.warning("Skipping CSV row %r: %s", row, exc)

    if not flights:
        raise HTTPException(
            status_code=422,
            detail="Не удалось распарсить ни одной записи. Проверьте формат CSV.",
        )

    saved = storage.save_flights(flights)
    return InitResult(
        flights_loaded=saved,
        message=(
            f"Загружено {saved} рейсов из {len(flights)} записей "
            "(дублирующиеся пропущены)"
        ),
    )
