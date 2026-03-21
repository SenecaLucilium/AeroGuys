"""
Интерфейс для извлечения данных из БД.
Позволяет получать данные о полетах, самолетах и статистику.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from enum import Enum

from DB.dbManager import DatabaseManager


class SortOrder(Enum):
    ASC = "ASC"
    DESC = "DESC"


@dataclass
class FlightInfo:
    """Информация о полете для выдачи"""
    id: int
    icao24: str
    callsign: Optional[str]
    first_seen: datetime
    last_seen: datetime
    departure_airport: Optional[str]
    arrival_airport: Optional[str]
    duration_minutes: float
    
    @classmethod
    def from_db_row(cls, row):
        first_seen = datetime.fromtimestamp(row[3])
        last_seen = datetime.fromtimestamp(row[4])
        return cls(
            id=row[0],
            icao24=row[1],
            callsign=row[2],
            first_seen=first_seen,
            last_seen=last_seen,
            departure_airport=row[5],
            arrival_airport=row[6],
            duration_minutes=(last_seen - first_seen).total_seconds() / 60
        )


@dataclass
class AircraftPosition:
    """Текущая позиция самолета"""
    icao24: str
    callsign: Optional[str]
    latitude: float
    longitude: float
    altitude: Optional[float]  # метры
    speed: Optional[float]      # км/ч
    vertical_rate: Optional[float]  # м/с
    on_ground: bool
    last_contact: datetime
    origin_country: str
    
    @classmethod
    def from_db_row(cls, row):
        return cls(
            icao24=row[0],
            callsign=row[1],
            latitude=row[2],
            longitude=row[3],
            altitude=row[4],
            speed=row[5] * 3.6 if row[5] else None,  # м/с -> км/ч
            vertical_rate=row[6],
            on_ground=row[7],
            last_contact=datetime.fromtimestamp(row[8]),
            origin_country=row[9]
        )


@dataclass
class AirportStats:
    """Статистика по аэропорту"""
    airport: str
    departures: int
    arrivals: int
    total_flights: int
    first_seen: datetime
    last_seen: datetime


class DatabaseQueries:
    """Класс для выполнения запросов к БД"""
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
    
    # ==================  ЗАПРОСЫ ПОЛЕТОВ  ==================
    
    def get_flights_by_aircraft(self, icao24: str, 
                                start_time: Optional[datetime] = None,
                                end_time: Optional[datetime] = None,
                                limit: int = 100) -> List[FlightInfo]:
        """
        Получить все полеты конкретного самолета по его ICAO24 коду
        """
        query = """
            SELECT id, icao24, callsign, first_seen, last_seen,
                   est_departure_airport, est_arrival_airport
            FROM flights
            WHERE icao24 = %s
        """
        params = [icao24.lower()]
        
        if start_time:
            query += " AND first_seen >= %s"
            params.append(int(start_time.timestamp()))
        
        if end_time:
            query += " AND last_seen <= %s"
            params.append(int(end_time.timestamp()))
        
        query += " ORDER BY first_seen DESC LIMIT %s"
        params.append(limit)
        
        with self.db.get_cursor() as cursor:
            cursor.execute(query, params)
            return [FlightInfo.from_db_row(row) for row in cursor.fetchall()]
    
    def get_flights_by_airport(self, airport: str, 
                               start_time: Optional[datetime] = None,
                               end_time: Optional[datetime] = None,
                               flight_type: str = 'both') -> List[FlightInfo]:
        """
        Получить все полеты через аэропорт
        flight_type: 'departure', 'arrival', 'both'
        """
        query = """
            SELECT id, icao24, callsign, first_seen, last_seen,
                   est_departure_airport, est_arrival_airport
            FROM flights
            WHERE 1=1
        """
        params = []
        
        if flight_type == 'departure':
            query += " AND est_departure_airport = %s"
            params.append(airport.upper())
        elif flight_type == 'arrival':
            query += " AND est_arrival_airport = %s"
            params.append(airport.upper())
        elif flight_type == 'both':
            query += " AND (est_departure_airport = %s OR est_arrival_airport = %s)"
            params.extend([airport.upper(), airport.upper()])
        
        if start_time:
            query += " AND first_seen >= %s"
            params.append(int(start_time.timestamp()))
        
        if end_time:
            query += " AND last_seen <= %s"
            params.append(int(end_time.timestamp()))
        
        query += " ORDER BY first_seen DESC"
        
        with self.db.get_cursor() as cursor:
            cursor.execute(query, params)
            return [FlightInfo.from_db_row(row) for row in cursor.fetchall()]
    
    def get_flights_by_route(self, departure: str, arrival: str,
                            start_time: Optional[datetime] = None,
                            end_time: Optional[datetime] = None) -> List[FlightInfo]:
        """
        Получить все полеты по конкретному маршруту
        """
        query = """
            SELECT id, icao24, callsign, first_seen, last_seen,
                   est_departure_airport, est_arrival_airport
            FROM flights
            WHERE est_departure_airport = %s AND est_arrival_airport = %s
        """
        params = [departure.upper(), arrival.upper()]
        
        if start_time:
            query += " AND first_seen >= %s"
            params.append(int(start_time.timestamp()))
        
        if end_time:
            query += " AND last_seen <= %s"
            params.append(int(end_time.timestamp()))
        
        query += " ORDER BY first_seen DESC"
        
        with self.db.get_cursor() as cursor:
            cursor.execute(query, params)
            return [FlightInfo.from_db_row(row) for row in cursor.fetchall()]
    
    # ==================  ТЕКУЩИЕ ПОЗИЦИИ  ==================
    
    def get_current_positions(self, 
                             min_lat: Optional[float] = None,
                             max_lat: Optional[float] = None,
                             min_lon: Optional[float] = None,
                             max_lon: Optional[float] = None,
                             min_altitude: Optional[float] = None,
                             on_ground_only: bool = False,
                             airborne_only: bool = False,
                             limit: int = 1000) -> List[AircraftPosition]:
        """
        Получить текущие позиции самолетов из последнего снапшота
        """
        query = """
            SELECT 
                sv.icao24, sv.callsign, 
                sv.latitude, sv.longitude,
                sv.baro_altitude, sv.velocity, sv.vertical_rate,
                sv.on_ground, sv.last_contact, sv.origin_country
            FROM state_vectors sv
            WHERE sv.snapshot_id = (
                SELECT id FROM snapshots ORDER BY api_timestamp DESC LIMIT 1
            )
                AND sv.latitude IS NOT NULL 
                AND sv.longitude IS NOT NULL
        """
        params = []
        
        if min_lat is not None:
            query += " AND sv.latitude >= %s"
            params.append(min_lat)
        if max_lat is not None:
            query += " AND sv.latitude <= %s"
            params.append(max_lat)
        if min_lon is not None:
            query += " AND sv.longitude >= %s"
            params.append(min_lon)
        if max_lon is not None:
            query += " AND sv.longitude <= %s"
            params.append(max_lon)
        if min_altitude is not None:
            query += " AND sv.baro_altitude >= %s"
            params.append(min_altitude)
        if on_ground_only:
            query += " AND sv.on_ground = TRUE"
        if airborne_only:
            query += " AND sv.on_ground = FALSE"
        
        query += " ORDER BY sv.last_contact DESC LIMIT %s"
        params.append(limit)
        
        with self.db.get_cursor() as cursor:
            cursor.execute(query, params)
            return [AircraftPosition.from_db_row(row) for row in cursor.fetchall()]
    
    def get_aircraft_by_callsign(self, callsign: str) -> Optional[AircraftPosition]:
        """
        Найти самолет по позывному (например, "AFL123")
        """
        query = """
            SELECT 
                sv.icao24, sv.callsign, 
                sv.latitude, sv.longitude,
                sv.baro_altitude, sv.velocity, sv.vertical_rate,
                sv.on_ground, sv.last_contact, sv.origin_country
            FROM state_vectors sv
            WHERE sv.snapshot_id = (
                SELECT id FROM snapshots ORDER BY api_timestamp DESC LIMIT 1
            )
                AND UPPER(sv.callsign) LIKE UPPER(%s)
            LIMIT 1
        """
        
        with self.db.get_cursor() as cursor:
            cursor.execute(query, [f'%{callsign}%'])
            row = cursor.fetchone()
            return AircraftPosition.from_db_row(row) if row else None
    
    # ==================  СТАТИСТИКА  ==================
    
    def get_airport_stats(self, days: int = 7) -> List[AirportStats]:
        """
        Получить статистику по аэропортам за последние N дней
        """
        cutoff = int((datetime.now() - timedelta(days=days)).timestamp())
        
        query = """
            SELECT 
                COALESCE(est_departure_airport, est_arrival_airport) as airport,
                COUNT(CASE WHEN est_departure_airport IS NOT NULL THEN 1 END) as departures,
                COUNT(CASE WHEN est_arrival_airport IS NOT NULL THEN 1 END) as arrivals,
                COUNT(*) as total,
                MIN(first_seen) as first_flight,
                MAX(last_seen) as last_flight
            FROM flights
            WHERE (est_departure_airport IS NOT NULL OR est_arrival_airport IS NOT NULL)
                AND first_seen >= %s
            GROUP BY airport
            HAVING COUNT(*) > 10
            ORDER BY total DESC
        """
        
        with self.db.get_cursor() as cursor:
            cursor.execute(query, [cutoff])
            stats = []
            for row in cursor.fetchall():
                stats.append(AirportStats(
                    airport=row[0],
                    departures=row[1],
                    arrivals=row[2],
                    total_flights=row[3],
                    first_seen=datetime.fromtimestamp(row[4]),
                    last_seen=datetime.fromtimestamp(row[5])
                ))
            return stats
    
    def get_traffic_hourly(self, airport: Optional[str] = None, 
                          days: int = 7) -> Dict[int, int]:
        """
        Получить почасовую статистику трафика
        """
        query = """
            SELECT 
                EXTRACT(HOUR FROM TO_TIMESTAMP(first_seen)) as hour,
                COUNT(*) as flights
            FROM flights
            WHERE first_seen >= %s
        """
        params = [int((datetime.now() - timedelta(days=days)).timestamp())]
        
        if airport:
            query += " AND (est_departure_airport = %s OR est_arrival_airport = %s)"
            params.extend([airport.upper(), airport.upper()])
        
        query += " GROUP BY hour ORDER BY hour"
        
        with self.db.get_cursor() as cursor:
            cursor.execute(query, params)
            return {int(row[0]): row[1] for row in cursor.fetchall()}
    
    def get_top_airlines(self, limit: int = 10) -> List[Tuple[str, int]]:
        """
        Получить топ авиакомпаний по количеству рейсов
        (по первым трем буквам callsign)
        """
        query = """
            SELECT 
                LEFT(callsign, 3) as airline_code,
                COUNT(*) as flight_count
            FROM flights
            WHERE callsign IS NOT NULL
            GROUP BY airline_code
            ORDER BY flight_count DESC
            LIMIT %s
        """
        
        with self.db.get_cursor() as cursor:
            cursor.execute(query, [limit])
            return [(row[0], row[1]) for row in cursor.fetchall()]
    
    # ==================  ТРЕКИ  ==================
    
    def get_flight_track(self, flight_id: int) -> Optional[List[Dict]]:
        """
        Получить трек полета по ID полета
        """
        query = """
            SELECT 
                w.time,
                w.latitude,
                w.longitude,
                w.baro_altitude,
                w.true_track,
                w.on_ground
            FROM flights f
            JOIN flight_tracks ft ON ft.icao24 = f.icao24 
                AND ft.start_time <= f.last_seen 
                AND ft.end_time >= f.first_seen
            JOIN waypoints w ON w.flight_track_id = ft.id
                AND w.time BETWEEN f.first_seen AND f.last_seen
            WHERE f.id = %s
            ORDER BY w.time
        """
        
        with self.db.get_cursor() as cursor:
            cursor.execute(query, [flight_id])
            rows = cursor.fetchall()
            if not rows:
                return None
            
            track = []
            for row in rows:
                track.append({
                    'time': datetime.fromtimestamp(row[0]),
                    'lat': row[1],
                    'lon': row[2],
                    'altitude': row[3],
                    'track': row[4],
                    'on_ground': row[5]
                })
            return track
    
    # ==================  ЭКСПОРТ  ==================
    
    def export_flights_to_csv(self, start_time: datetime, 
                            end_time: datetime,
                            filename: str = 'flights_export.csv'):
        """
        Экспортировать полеты в CSV файл
        """
        import csv
        
        query = """
            SELECT 
                icao24, callsign, 
                TO_TIMESTAMP(first_seen) as departure_time,
                TO_TIMESTAMP(last_seen) as arrival_time,
                est_departure_airport,
                est_arrival_airport,
                (last_seen - first_seen) / 60 as duration_minutes
            FROM flights
            WHERE first_seen >= %s AND last_seen <= %s
            ORDER BY first_seen
        """
        
        params = [int(start_time.timestamp()), int(end_time.timestamp())]
        
        with self.db.get_cursor() as cursor:
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            with open(filename, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['ICAO24', 'Callsign', 'Departure Time', 
                               'Arrival Time', 'From', 'To', 'Duration (min)'])
                writer.writerows(rows)
            
            print(f"Экспортировано {len(rows)} полетов в {filename}")