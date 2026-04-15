"""
AeroGuys REST API — точка входа.
Запуск: uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routers import realtime, airports, aircraft, routes, export, init

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Инициализация схемы БД при старте сервера."""
    try:
        from api.dependencies import _get_db_manager
        from DB.schema import init_schema
        db = _get_db_manager()
        if init_schema(db):
            logger.info("Database schema initialised successfully")
        else:
            logger.warning("Database schema initialisation returned False")
    except Exception as exc:
        logger.error("Failed to initialise DB schema on startup: %s", exc)
    yield

app = FastAPI(
    title="AeroGuys API",
    description="REST API для анализа авиационных данных из OpenSky Network.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ---------- CORS ----------
# В продакшене замените origins на реальный адрес фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ---------- Роутеры ----------
app.include_router(init.router,     prefix="/api/init",     tags=["Инициализация"])
app.include_router(realtime.router, prefix="/api/realtime", tags=["Реальное время"])
app.include_router(airports.router, prefix="/api/airports", tags=["Аэропорты"])
app.include_router(aircraft.router, prefix="/api/aircraft", tags=["Воздушные суда"])
app.include_router(routes.router,   prefix="/api/routes",   tags=["Маршруты"])
app.include_router(export.router,   prefix="/api/export",   tags=["Экспорт"])


@app.get("/api/health", tags=["Служебные"])
def healthcheck():
    return {"status": "ok"}
