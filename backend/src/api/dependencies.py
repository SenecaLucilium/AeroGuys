"""
Dependency injection: DatabaseQueries создаётся единожды при старте,
передаётся в каждый запрос через FastAPI DI.
"""

import os
import sys
from functools import lru_cache
from pathlib import Path

# Добавляем src/ в путь, если файл запускается напрямую
sys.path.insert(0, str(Path(__file__).parent.parent))

from DB.dbManager import DatabaseManager
from Analysis.queries import DatabaseQueries


@lru_cache(maxsize=1)
def _get_db_manager() -> DatabaseManager:
    return DatabaseManager()


def get_queries() -> DatabaseQueries:
    """FastAPI dependency: возвращает экземпляр DatabaseQueries."""
    return DatabaseQueries(_get_db_manager())
