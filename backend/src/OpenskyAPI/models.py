from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Dict, Tuple
from enum import IntEnum

class AircraftCategory(IntEnum):
    """Категории воздушных судов"""
    NO_ADS_B_INFO = 1
    LIGHT = 2  # < 15500 lbs
    SMALL = 3  # 15500 to 75000 lbs
    LARGE = 4  # 75000 to 300000 lbs
    HIGH_VORTEX_LARGE = 5  # B-757
    HEAVY = 6  # > 300000 lbs
    HIGH_PERFORMANCE = 7  # > 5g acceleration and 400 kts
    ROTORCRAFT = 8
    GLIDER = 9
    LIGHTER_THAN_AIR = 10
    PARACHUTIST = 11
    ULTRALIGHT = 12
    RESERVED = 13
    UAV = 14
    SPACE = 15
    EMERGENCY_VEHICLE = 16
    SERVICE_VEHICLE = 17
    POINT_OBSTACLE = 18
    CLUSTER_OBSTACLE = 19
    LINE_OBSTACLE = 20

    @classmethod
    def get_name(cls, value: int) -> str:
        try:
            return cls(value).name.replace('_', ' ').title()
        except ValueError:
            return f"Unknown ({value})"

class PositionSource(IntEnum):
    """Источник позиции"""
    ADS_B = 0
    ASTERIX = 1
    MLAT = 2
    FLARM = 3

@dataclass
class StateVector:
    """Состояние воздушного судна в определенный момент времени"""
    
    # Основная информация
    icao24: str
    callsign: Optional[str]
    origin_country: str
    
    # Временные метки
    time_position: Optional[int]
    last_contact: int
    
    # Позиция
    longitude: Optional[float]
    latitude: Optional[float]
    baro_altitude: Optional[float]  # метры
    geo_altitude: Optional[float]  # метры
    on_ground: bool
    
    # Движение
    velocity: Optional[float]  # м/с
    true_track: Optional[float]  # градусы от севера
    vertical_rate: Optional[float]  # м/с (+ подъем, - снижение)
    
    # Дополнительная информация
    sensors: Optional[List[int]]
    squawk: Optional[str]  # транспондерный код
    spi: bool  # special purpose indicator
    position_source: int
    category: int  # AircraftCategory

    @classmethod
    def from_api_array(cls, arr: List) -> 'StateVector':
        return cls(
            icao24=arr[0],
            callsign=arr[1].strip() if arr[1] else None,
            origin_country=arr[2],
            time_position=arr[3],
            last_contact=arr[4],
            longitude=arr[5],
            latitude=arr[6],
            baro_altitude=arr[7],
            on_ground=arr[8],
            velocity=arr[9],
            true_track=arr[10],
            vertical_rate=arr[11],
            sensors=arr[12],
            geo_altitude=arr[13],
            squawk=arr[14],
            spi=arr[15],
            position_source=arr[16],
            category=arr[17] if len(arr) > 17 else 0
        )

    @property
    def category_name(self) -> str:
        return AircraftCategory.get_name(self.category)
    
    @property
    def velocity_kmh(self) -> Optional[float]:
        return self.velocity * 3.6 if self.velocity is not None else None
    
    def is_valid_position(self) -> bool:
        return (self.latitude is not None and 
                self.longitude is not None and
                self.baro_altitude is not None)

@dataclass
class OpenSkyStates:
    """Коллекция состояний воздушного пространства"""
    time: int
    states: List[StateVector]
    
    @classmethod
    def from_api_response(cls, data: dict) -> Optional['OpenSkyStates']:
        if not data or 'states' not in data or data['states'] is None:
            return None
        
        states = [StateVector.from_api_array(s) for s in data['states']]
        return cls(time=data['time'], states=states)
    
    def filter_valid_positions(self) -> List[StateVector]:
        return [s for s in self.states if s.is_valid_position()]

@dataclass
class FlightData:
    """Данные о конкретном полете"""
    
    icao24: str
    first_seen: int
    est_departure_airport: Optional[str]  # ICAO код
    last_seen: int
    est_arrival_airport: Optional[str]  # ICAO код
    callsign: Optional[str]
    
    est_departure_airport_horiz_distance: Optional[int]
    est_departure_airport_vert_distance: Optional[int]
    est_arrival_airport_horiz_distance: Optional[int]
    est_arrival_airport_vert_distance: Optional[int]
    
    departure_airport_candidates_count: Optional[int]
    arrival_airport_candidates_count: Optional[int]
    
    @classmethod
    def from_api_dict(cls, data: dict) -> 'FlightData':
        return cls(
            icao24=data['icao24'],
            first_seen=data['firstSeen'],
            est_departure_airport=data.get('estDepartureAirport'),
            last_seen=data['lastSeen'],
            est_arrival_airport=data.get('estArrivalAirport'),
            callsign=data.get('callsign', '').strip() if data.get('callsign') else None,
            est_departure_airport_horiz_distance=data.get('estDepartureAirportHorizDistance'),
            est_departure_airport_vert_distance=data.get('estDepartureAirportVertDistance'),
            est_arrival_airport_horiz_distance=data.get('estArrivalAirportHorizDistance'),
            est_arrival_airport_vert_distance=data.get('estArrivalAirportVertDistance'),
            departure_airport_candidates_count=data.get('departureAirportCandidatesCount'),
            arrival_airport_candidates_count=data.get('arrivalAirportCandidatesCount')
        )
    
    @property
    def duration_seconds(self) -> int:
        return self.last_seen - self.first_seen
    
    @property
    def duration_hours(self) -> float:
        return self.duration_seconds / 3600
    
    @property
    def departure_hour(self) -> int:
        return datetime.fromtimestamp(self.first_seen).hour
    
    @property
    def arrival_hour(self) -> int:
        return datetime.fromtimestamp(self.last_seen).hour

@dataclass
class Waypoint:
    """Точка маршрута"""
    time: int
    latitude: Optional[float]
    longitude: Optional[float]
    baro_altitude: Optional[float]  # метры
    true_track: Optional[float]  # градусы
    on_ground: bool
    
    @classmethod
    def from_api_array(cls, arr: List) -> 'Waypoint':
        return cls(
            time=arr[0],
            latitude=arr[1],
            longitude=arr[2],
            baro_altitude=arr[3],
            true_track=arr[4],
            on_ground=arr[5]
        )
    
    def is_valid(self) -> bool:
        return (self.latitude is not None and self.longitude is not None)

@dataclass
class FlightTrack:
    """Траектория полета"""
    icao24: str
    start_time: int
    end_time: int
    callsign: Optional[str]
    path: List[Waypoint]
    
    @classmethod
    def from_api_response(cls, data: dict) -> Optional['FlightTrack']:
        if not data or 'path' not in data:
            return None
        
        path = [Waypoint.from_api_array(w) for w in data['path']]
        return cls(
            icao24=data['icao24'],
            start_time=data['startTime'],
            end_time=data['endTime'],
            callsign=data.get('callsign', '').strip() if data.get('callsign') else None,
            path=path
        )
    
    @property
    def duration_seconds(self) -> int:
        return self.end_time - self.start_time
    
    @property
    def valid_waypoints(self) -> List[Waypoint]:
        return [w for w in self.path if w.is_valid()]

@dataclass
class BoundingBox:
    """Географическая область (bbox)"""
    lat_min: float  # нижняя граница широты
    lat_max: float  # верхняя граница широты
    lon_min: float  # нижняя граница долготы
    lon_max: float  # верхняя граница долготы
    
    def __post_init__(self):
        """Валидация"""
        if not (-90 <= self.lat_min <= 90) or not (-90 <= self.lat_max <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        if not (-180 <= self.lon_min <= 180) or not (-180 <= self.lon_max <= 180):
            raise ValueError("Longitude must be between -180 and 180")
        if self.lat_min >= self.lat_max:
            raise ValueError("lat_min must be less than lat_max")
        if self.lon_min >= self.lon_max:
            raise ValueError("lon_min must be less than lon_max")
    
    @property
    def area_square_degrees(self) -> float:
        return (self.lat_max - self.lat_min) * (self.lon_max - self.lon_min)
    
    def contains(self, lat: float, lon: float) -> bool:
        return (self.lat_min <= lat <= self.lat_max and
                self.lon_min <= lon <= self.lon_max)


@dataclass
class AirportCoordinates:
    """Координаты аэропорта"""
    icao: str
    lat: float
    lon: float
    name: Optional[str] = None