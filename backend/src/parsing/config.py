from dataclasses import dataclass
from typing import List, Optional
from OpenskyAPI.models import BoundingBox

@dataclass
class PollingConfig:
    """Конфигурация одного цикла polling"""

    collect_states: bool = True # Собирать ли state вектора
    states_bbox: Optional[BoundingBox] = None # Bbox для state векторов (None = весь мир)
    collect_flights: bool = True
    flights_hours_back: int = 2  # 2 часа макс по API
    collect_tracks: bool = False
    track_icao24_list: List[str] = None
    airports_to_track: List[str] = None # Список аэропортов

    def __post_init__(self):
        if self.airports_to_track is None:
            self.airports_to_track = [
                'EDDF',  # Франкфурт
                'LFPG',  # Париж CDG
                'EGLL',  # Лондон Heathrow
                'LEMD',  # Мадрид
                'EDDM',  # Мюнхен
                'LIRF',  # Рим
                'EHAM',  # Амстердам
            ]

        if self.track_icao24_list is None:
            self.track_icao24_list = []