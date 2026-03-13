from .config import PollingConfig
from OpenskyAPI.models import BoundingBox

def get_europe_config() -> PollingConfig:
    """Конфигурация для Европы"""
    europe_bbox = BoundingBox(
        lat_min=36.0,   # Южная граница (юг Испании/Греции)
        lat_max=71.0,   # Северная граница (Скандинавия)
        lon_min=-10.0,  # Западная граница (Атлантика)
        lon_max=40.0    # Восточная граница (Восточная Европа)
    )
    
    return PollingConfig(
        collect_states=True,
        states_bbox=europe_bbox,
        collect_flights=True,
        flights_hours_back=2,
        collect_tracks=False
    )


def get_full_world_config() -> PollingConfig:
    """Конфигурация для всего мира"""
    return PollingConfig(
        collect_states=True,
        states_bbox=None,  # весь мир
        collect_flights=True,
        flights_hours_back=2,
        collect_tracks=False
    )


def get_minimal_config() -> PollingConfig:
    """Минимальная конфигурация для тестов"""
    test_bbox = BoundingBox(
        lat_min=48.0,
        lat_max=52.0,
        lon_min=2.0,
        lon_max=9.0
    )
    
    return PollingConfig(
        collect_states=True,
        states_bbox=test_bbox,
        collect_flights=False,  # не собираем flights
        airports_to_track=['EDDF'],  # только Франкфурт
        collect_tracks=False
    )