"""
Data polling module для AeroGuys.
Собирает данные из OpenSky API и сохраняет в PostgreSQL.
"""

from .data_collector import DataCollector
from .storage import DataStorage
from .config import PollingConfig
from .default_configs import (
    get_europe_config,
    get_full_world_config,
    get_minimal_config
)

__all__ = [
    'DataCollector',
    'DataStorage',
    'PollingConfig',
    'get_europe_config',
    'get_full_world_config',
    'get_minimal_config'
]
