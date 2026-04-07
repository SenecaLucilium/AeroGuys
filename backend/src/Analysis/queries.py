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
    
    # ==================  МОНИТОРИНГ В РЕАЛЬНОМ ВРЕМЕНИ  ==================

    def get_airport_busyness(self, hours_back: int = 24, limit: int = 20) -> List[AirportStats]:
        """
        Рейтинг загруженности аэропортов за последние N часов.
        Возвращает аэропорты, отсортированные по общему числу рейсов.
        """
        cutoff = int((datetime.now() - timedelta(hours=hours_back)).timestamp())

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
            ORDER BY total DESC
            LIMIT %s
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query, [cutoff, limit])
            return [
                AirportStats(
                    airport=row[0],
                    departures=row[1],
                    arrivals=row[2],
                    total_flights=row[3],
                    first_seen=datetime.fromtimestamp(row[4]),
                    last_seen=datetime.fromtimestamp(row[5]),
                )
                for row in cursor.fetchall()
            ]

    def get_fastest_aircraft(self, limit: int = 20) -> List[AircraftPosition]:
        """
        Рейтинг самых быстрых самолётов из последнего снапшота (в воздухе).
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
                AND sv.velocity IS NOT NULL
                AND sv.on_ground = FALSE
                AND sv.latitude IS NOT NULL
            ORDER BY sv.velocity DESC
            LIMIT %s
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query, [limit])
            return [AircraftPosition.from_db_row(row) for row in cursor.fetchall()]

    def get_highest_aircraft(self, limit: int = 20) -> List[AircraftPosition]:
        """
        Рейтинг самолётов по высоте полёта из последнего снапшота (в воздухе).
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
                AND sv.baro_altitude IS NOT NULL
                AND sv.on_ground = FALSE
                AND sv.latitude IS NOT NULL
            ORDER BY sv.baro_altitude DESC
            LIMIT %s
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query, [limit])
            return [AircraftPosition.from_db_row(row) for row in cursor.fetchall()]

    # ==================  АНАЛИЗ АЭРОПОРТОВ  ==================

    def get_airport_peak_hours(self, airport: str, days: int = 7) -> Dict[str, Dict[int, int]]:
        """
        Пиковые часы в аэропорту: почасовое распределение вылетов и прилётов раздельно.
        Возвращает {'departure': {час: кол-во}, 'arrival': {час: кол-во}}
        """
        cutoff = int((datetime.now() - timedelta(days=days)).timestamp())
        airport = airport.upper()

        query = """
            SELECT
                CASE
                    WHEN est_departure_airport = %s THEN 'departure'
                    ELSE 'arrival'
                END as direction,
                EXTRACT(HOUR FROM TO_TIMESTAMP(first_seen))::INT as hour,
                COUNT(*) as flights
            FROM flights
            WHERE first_seen >= %s
                AND (est_departure_airport = %s OR est_arrival_airport = %s)
            GROUP BY direction, hour
            ORDER BY direction, hour
        """

        result: Dict[str, Dict[int, int]] = {'departure': {}, 'arrival': {}}
        with self.db.get_cursor() as cursor:
            cursor.execute(query, [airport, cutoff, airport, airport])
            for row in cursor.fetchall():
                direction, hour, count = row[0], int(row[1]), row[2]
                result[direction][hour] = count
        return result

    def get_airport_destinations(self, airport: str, days: int = 7) -> List[Dict]:
        """
        География направлений из аэропорта: куда и сколько рейсов.
        Присоединяет данные из таблицы airports (страна, координаты), если она заполнена.
        """
        cutoff = int((datetime.now() - timedelta(days=days)).timestamp())

        query = """
            SELECT
                f.est_arrival_airport           AS destination,
                a.country,
                a.name                          AS airport_name,
                a.latitude,
                a.longitude,
                COUNT(*)                        AS flight_count
            FROM flights f
            LEFT JOIN airports a ON a.icao = f.est_arrival_airport
            WHERE f.est_departure_airport = %s
                AND f.est_arrival_airport IS NOT NULL
                AND f.first_seen >= %s
            GROUP BY f.est_arrival_airport, a.country, a.name, a.latitude, a.longitude
            ORDER BY flight_count DESC
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query, [airport.upper(), cutoff])
            return [
                {
                    'destination': row[0],
                    'country': row[1],
                    'airport_name': row[2],
                    'latitude': row[3],
                    'longitude': row[4],
                    'flight_count': row[5],
                }
                for row in cursor.fetchall()
            ]

    def get_airport_throughput(self, airports: List[str], days: int = 7) -> List[Dict]:
        """
        Пропускная способность аэропортов: среднее число рейсов в час за период.
        Принимает список ICAO-кодов для сравнения нескольких аэропортов сразу.
        """
        cutoff = int((datetime.now() - timedelta(days=days)).timestamp())
        airports_upper = [a.upper() for a in airports]

        query = """
            SELECT
                COALESCE(est_departure_airport, est_arrival_airport)    AS airport,
                COUNT(*)                                                 AS total_flights,
                COUNT(CASE WHEN est_departure_airport IS NOT NULL THEN 1 END) AS departures,
                COUNT(CASE WHEN est_arrival_airport IS NOT NULL THEN 1 END)   AS arrivals,
                ROUND(COUNT(*)::numeric / (%s * 24), 2)                 AS avg_flights_per_hour
            FROM flights
            WHERE (est_departure_airport = ANY(%s) OR est_arrival_airport = ANY(%s))
                AND first_seen >= %s
            GROUP BY airport
            ORDER BY avg_flights_per_hour DESC
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query, [days, airports_upper, airports_upper, cutoff])
            return [
                {
                    'airport': row[0],
                    'total_flights': row[1],
                    'departures': row[2],
                    'arrivals': row[3],
                    'avg_flights_per_hour': float(row[4]) if row[4] else 0.0,
                }
                for row in cursor.fetchall()
            ]

    # ==================  АНАЛИЗ ВОЗДУШНЫХ СУДОВ  ==================

    def get_aircraft_daily_usage(self, icao24: str, days: int = 30) -> List[Dict]:
        """
        Налёт конкретного самолёта по дням: дата, количество рейсов, суммарные часы.
        """
        cutoff = int((datetime.now() - timedelta(days=days)).timestamp())

        query = """
            SELECT
                DATE(TO_TIMESTAMP(first_seen))                                  AS flight_date,
                COUNT(*)                                                         AS flights,
                ROUND(SUM(last_seen - first_seen)::numeric / 3600, 2)           AS total_hours
            FROM flights
            WHERE icao24 = %s AND first_seen >= %s
            GROUP BY flight_date
            ORDER BY flight_date
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query, [icao24.lower(), cutoff])
            return [
                {
                    'date': str(row[0]),
                    'flights': row[1],
                    'total_hours': float(row[2]) if row[2] else 0.0,
                }
                for row in cursor.fetchall()
            ]

    def get_aircraft_typical_routes(self, icao24: str, days: int = 30, limit: int = 10) -> List[Dict]:
        """
        Типичные маршруты конкретного самолёта: топ пар аэропортов по числу выполненных рейсов.
        """
        cutoff = int((datetime.now() - timedelta(days=days)).timestamp())

        query = """
            SELECT
                est_departure_airport,
                est_arrival_airport,
                COUNT(*)                                                    AS times_flown,
                ROUND(AVG(last_seen - first_seen)::numeric / 60, 1)        AS avg_duration_minutes
            FROM flights
            WHERE icao24 = %s
                AND first_seen >= %s
                AND est_departure_airport IS NOT NULL
                AND est_arrival_airport IS NOT NULL
            GROUP BY est_departure_airport, est_arrival_airport
            ORDER BY times_flown DESC
            LIMIT %s
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query, [icao24.lower(), cutoff, limit])
            return [
                {
                    'departure': row[0],
                    'arrival': row[1],
                    'times_flown': row[2],
                    'avg_duration_minutes': float(row[3]) if row[3] else None,
                }
                for row in cursor.fetchall()
            ]

    def get_popular_aircraft_types(self, days: int = 7,
                                   min_lat: Optional[float] = None,
                                   max_lat: Optional[float] = None,
                                   min_lon: Optional[float] = None,
                                   max_lon: Optional[float] = None) -> List[Dict]:
        """
        Популярные типы ВС в регионе (по категории ADS-B) за последние N дней.
        Фильтрация по bbox опциональна.
        """
        _CATEGORY_NAMES = {
            0: 'No info', 1: 'No ADS-B info', 2: 'Light (<15500 lbs)',
            3: 'Small (15500-75000 lbs)', 4: 'Large (75000-300000 lbs)',
            5: 'High vortex large (B757)', 6: 'Heavy (>300000 lbs)',
            7: 'High performance (>5g, 400kts)', 8: 'Rotorcraft', 9: 'Glider',
            10: 'Lighter than air', 11: 'Parachutist', 12: 'Ultralight',
            13: 'Reserved', 14: 'UAV', 15: 'Space vehicle',
            16: 'Emergency surface vehicle', 17: 'Service surface vehicle',
            18: 'Point obstacle', 19: 'Cluster obstacle', 20: 'Line obstacle',
        }

        cutoff = int((datetime.now() - timedelta(days=days)).timestamp())

        query = """
            SELECT
                sv.category,
                COUNT(DISTINCT sv.icao24)   AS unique_aircraft,
                COUNT(*)                    AS observations
            FROM state_vectors sv
            JOIN snapshots s ON s.id = sv.snapshot_id
            WHERE s.api_timestamp >= %s
                AND sv.latitude IS NOT NULL
        """
        params: List = [cutoff]

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

        query += " GROUP BY sv.category ORDER BY unique_aircraft DESC"

        with self.db.get_cursor() as cursor:
            cursor.execute(query, params)
            return [
                {
                    'category': row[0],
                    'category_name': _CATEGORY_NAMES.get(row[0], f'Category {row[0]}'),
                    'unique_aircraft': row[1],
                    'observations': row[2],
                }
                for row in cursor.fetchall()
            ]

    def get_altitude_speed_by_category(self) -> List[Dict]:
        """
        Высотный профиль типов ВС из последнего снапшота:
        средняя и медианная высота, средняя скорость по категориям ADS-B.
        """
        _CATEGORY_NAMES = {
            0: 'No info', 1: 'No ADS-B info', 2: 'Light', 3: 'Small',
            4: 'Large', 5: 'High vortex large (B757)', 6: 'Heavy',
            7: 'High performance', 8: 'Rotorcraft', 9: 'Glider',
            10: 'Lighter than air', 11: 'Parachutist', 12: 'Ultralight',
            13: 'Reserved', 14: 'UAV', 15: 'Space vehicle',
        }

        query = """
            SELECT
                sv.category,
                ROUND(AVG(sv.baro_altitude)::numeric, 0)                                        AS avg_altitude_m,
                ROUND(AVG(sv.velocity * 3.6)::numeric, 1)                                       AS avg_speed_kmh,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY sv.baro_altitude)::numeric, 0) AS median_altitude_m,
                COUNT(DISTINCT sv.icao24)                                                        AS sample_aircraft
            FROM state_vectors sv
            WHERE sv.snapshot_id = (
                SELECT id FROM snapshots ORDER BY api_timestamp DESC LIMIT 1
            )
                AND sv.baro_altitude IS NOT NULL
                AND sv.velocity IS NOT NULL
                AND sv.on_ground = FALSE
            GROUP BY sv.category
            ORDER BY avg_altitude_m DESC NULLS LAST
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query)
            return [
                {
                    'category': row[0],
                    'category_name': _CATEGORY_NAMES.get(row[0], f'Category {row[0]}'),
                    'avg_altitude_m': float(row[1]) if row[1] else None,
                    'avg_speed_kmh': float(row[2]) if row[2] else None,
                    'median_altitude_m': float(row[3]) if row[3] else None,
                    'sample_aircraft': row[4],
                }
                for row in cursor.fetchall()
            ]

    def get_unidentified_aircraft(self, limit: int = 100) -> List[AircraftPosition]:
        """
        Военные / неопознанные самолёты из последнего снапшота:
        без позывного или со squawk кодами аварийных/военных ситуаций (7500/7600/7700/7777).
        """
        emergency_squawks = ['7500', '7600', '7700', '7777']

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
                AND (
                    sv.callsign IS NULL
                    OR TRIM(sv.callsign) = ''
                    OR sv.squawk = ANY(%s)
                )
            ORDER BY sv.last_contact DESC
            LIMIT %s
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query, [emergency_squawks, limit])
            return [AircraftPosition.from_db_row(row) for row in cursor.fetchall()]

    def get_business_aviation(self, limit: int = 100) -> List[AircraftPosition]:
        """
        Бизнес-авиация из последнего снапшота: воздушные суда категорий Light/Small/High-perf
        с позывным, не соответствующим шаблону стандартных авиакомпаний (3 буквы + цифры).
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
                AND sv.callsign IS NOT NULL
                AND TRIM(sv.callsign) != ''
                AND sv.category IN (2, 3, 7)
                AND sv.callsign !~ '^[A-Z]{3}[0-9]{1,4}[A-Z]?$'
            ORDER BY sv.baro_altitude DESC NULLS LAST
            LIMIT %s
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query, [limit])
            return [AircraftPosition.from_db_row(row) for row in cursor.fetchall()]

    def get_extreme_vertical_rates(self, threshold_ms: float = 10.0, limit: int = 50) -> List[Dict]:
        """
        Самолёты с экстремальной вертикальной скоростью (резкий набор или снижение).
        threshold_ms — порог в м/с (по умолчанию 10 м/с ≈ 2000 ft/min).
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
                AND sv.vertical_rate IS NOT NULL
                AND ABS(sv.vertical_rate) >= %s
                AND sv.on_ground = FALSE
                AND sv.latitude IS NOT NULL
            ORDER BY ABS(sv.vertical_rate) DESC
            LIMIT %s
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query, [threshold_ms, limit])
            return [
                {
                    'icao24': row[0],
                    'callsign': row[1].strip() if row[1] else None,
                    'latitude': row[2],
                    'longitude': row[3],
                    'altitude_m': row[4],
                    'speed_kmh': row[5] * 3.6 if row[5] else None,
                    'vertical_rate_ms': row[6],
                    'direction': 'climb' if row[6] > 0 else 'descent',
                    'last_contact': datetime.fromtimestamp(row[8]),
                    'origin_country': row[9],
                }
                for row in cursor.fetchall()
            ]

    # ==================  АНАЛИЗ МАРШРУТОВ  ==================

    def get_popular_routes(self, days: int = 7, limit: int = 20) -> List[Dict]:
        """
        Самые частотные пары аэропортов за период.
        """
        cutoff = int((datetime.now() - timedelta(days=days)).timestamp())

        query = """
            SELECT
                est_departure_airport                                       AS departure,
                est_arrival_airport                                         AS arrival,
                COUNT(*)                                                    AS flight_count,
                ROUND(AVG(last_seen - first_seen)::numeric / 60, 1)        AS avg_duration_minutes,
                COUNT(DISTINCT icao24)                                      AS unique_aircraft
            FROM flights
            WHERE est_departure_airport IS NOT NULL
                AND est_arrival_airport IS NOT NULL
                AND first_seen >= %s
            GROUP BY est_departure_airport, est_arrival_airport
            ORDER BY flight_count DESC
            LIMIT %s
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query, [cutoff, limit])
            return [
                {
                    'departure': row[0],
                    'arrival': row[1],
                    'flight_count': row[2],
                    'avg_duration_minutes': float(row[3]) if row[3] else None,
                    'unique_aircraft': row[4],
                }
                for row in cursor.fetchall()
            ]

    def get_route_efficiency(self, days: int = 7, limit: int = 20) -> List[Dict]:
        """
        Эффективность маршрутов: сравнение средней длительности полёта с ортодромией
        (кратчайшим расстоянием по большому кругу). Требует заполненной таблицы airports.
        Оценка фактического пути основана на средней крейсерской скорости 800 км/ч.
        """
        import math

        def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
            R = 6371.0
            phi1, phi2 = math.radians(lat1), math.radians(lat2)
            dphi = math.radians(lat2 - lat1)
            dlambda = math.radians(lon2 - lon1)
            a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
            return 2 * R * math.asin(math.sqrt(a))

        cutoff = int((datetime.now() - timedelta(days=days)).timestamp())

        query = """
            SELECT
                f.est_departure_airport,
                f.est_arrival_airport,
                COUNT(*)                                                AS flight_count,
                ROUND(AVG(f.last_seen - f.first_seen)::numeric / 60, 1) AS avg_duration_min,
                dep.latitude  AS dep_lat,  dep.longitude  AS dep_lon,
                arr.latitude  AS arr_lat,  arr.longitude  AS arr_lon
            FROM flights f
            JOIN airports dep ON dep.icao = f.est_departure_airport
            JOIN airports arr ON arr.icao = f.est_arrival_airport
            WHERE f.est_departure_airport IS NOT NULL
                AND f.est_arrival_airport IS NOT NULL
                AND f.first_seen >= %s
            GROUP BY f.est_departure_airport, f.est_arrival_airport,
                     dep.latitude, dep.longitude, arr.latitude, arr.longitude
            ORDER BY flight_count DESC
            LIMIT %s
        """

        with self.db.get_cursor() as cursor:
            cursor.execute(query, [cutoff, limit])
            rows = cursor.fetchall()

        result = []
        for row in rows:
            dep_icao, arr_icao = row[0], row[1]
            flight_count = row[2]
            avg_dur = float(row[3]) if row[3] else None
            dep_lat, dep_lon, arr_lat, arr_lon = row[4], row[5], row[6], row[7]

            gc_dist_km = haversine_km(dep_lat, dep_lon, arr_lat, arr_lon)
            estimated_dist_km = (avg_dur / 60) * 800 if avg_dur else None
            efficiency_pct = (
                round((gc_dist_km / estimated_dist_km) * 100, 1)
                if estimated_dist_km and estimated_dist_km > 0
                else None
            )

            result.append({
                'departure': dep_icao,
                'arrival': arr_icao,
                'flight_count': flight_count,
                'avg_duration_minutes': avg_dur,
                'great_circle_km': round(gc_dist_km, 1),
                'estimated_actual_km': round(estimated_dist_km, 1) if estimated_dist_km else None,
                'route_efficiency_pct': efficiency_pct,
            })
        return result

    # ==================  РАСПРЕДЕЛЕНИЯ И АГРЕГАТЫ  ==================

    def get_speed_distribution(self) -> List[Dict]:
        """Гистограмма скоростей самолётов из последнего снапшота (10 бакетов 0–1200 км/ч)."""
        BUCKET_SIZE = 120
        query = """
            SELECT
                width_bucket(sv.velocity * 3.6, 0, 1200, 10) AS bucket,
                COUNT(*) AS cnt
            FROM state_vectors sv
            WHERE sv.snapshot_id = (
                SELECT id FROM snapshots ORDER BY api_timestamp DESC LIMIT 1
            )
                AND sv.velocity IS NOT NULL
                AND sv.on_ground = FALSE
                AND sv.velocity > 0
            GROUP BY bucket
            ORDER BY bucket
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()
        result = []
        for row in rows:
            b = int(row[0])
            result.append({
                'bucket': b,
                'label': f'{(b-1)*BUCKET_SIZE}–{b*BUCKET_SIZE}',
                'min_kmh': (b - 1) * BUCKET_SIZE,
                'max_kmh': b * BUCKET_SIZE,
                'count': row[1],
            })
        return result

    def get_country_distribution(self, limit: int = 15) -> List[Dict]:
        """Топ стран по числу уникальных ВС в последнем снапшоте."""
        query = """
            SELECT origin_country, COUNT(DISTINCT icao24) AS aircraft_count
            FROM state_vectors
            WHERE snapshot_id = (
                SELECT id FROM snapshots ORDER BY api_timestamp DESC LIMIT 1
            )
                AND latitude IS NOT NULL
            GROUP BY origin_country
            ORDER BY aircraft_count DESC
            LIMIT %s
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(query, [limit])
            return [{'country': row[0], 'aircraft_count': row[1]} for row in cursor.fetchall()]

    def get_altitude_distribution(self) -> List[Dict]:
        """Гистограмма высот самолётов из последнего снапшота (10 бакетов 0–15 000 м)."""
        BUCKET_SIZE = 1500
        query = """
            SELECT
                width_bucket(sv.baro_altitude, 0, 15000, 10) AS bucket,
                COUNT(*) AS cnt
            FROM state_vectors sv
            WHERE sv.snapshot_id = (
                SELECT id FROM snapshots ORDER BY api_timestamp DESC LIMIT 1
            )
                AND sv.baro_altitude IS NOT NULL
                AND sv.baro_altitude >= 0
                AND sv.on_ground = FALSE
            GROUP BY bucket
            ORDER BY bucket
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(query)
            rows = cursor.fetchall()
        result = []
        for row in rows:
            b = int(row[0])
            min_m = (b - 1) * BUCKET_SIZE
            max_m = b * BUCKET_SIZE
            result.append({
                'bucket': b,
                'label': f'{min_m//1000}–{max_m//1000}k м',
                'min_m': min_m,
                'max_m': max_m,
                'count': row[1],
            })
        return result

    def get_snapshot_stats(self) -> Dict:
        """Агрегированная статистика последнего снапшота."""
        query = """
            SELECT
                COUNT(*)                                                AS total,
                COUNT(CASE WHEN on_ground = FALSE THEN 1 END)           AS airborne,
                COUNT(CASE WHEN on_ground = TRUE  THEN 1 END)           AS on_ground_cnt,
                ROUND(MAX(velocity * 3.6)::numeric, 0)                  AS max_speed_kmh,
                ROUND(MAX(baro_altitude)::numeric, 0)                   AS max_altitude_m,
                COUNT(DISTINCT origin_country)                          AS countries_count
            FROM state_vectors
            WHERE snapshot_id = (
                SELECT id FROM snapshots ORDER BY api_timestamp DESC LIMIT 1
            )
                AND latitude IS NOT NULL
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(query)
            row = cursor.fetchone()
        if not row or row[0] == 0:
            return {'total': 0, 'airborne': 0, 'on_ground': 0,
                    'max_speed_kmh': None, 'max_altitude_m': None, 'countries_count': 0}
        return {
            'total': row[0] or 0,
            'airborne': row[1] or 0,
            'on_ground': row[2] or 0,
            'max_speed_kmh': float(row[3]) if row[3] else None,
            'max_altitude_m': float(row[4]) if row[4] else None,
            'countries_count': row[5] or 0,
        }

    def get_duration_distribution(self, days: int = 7) -> List[Dict]:
        """Гистограмма длительностей рейсов за N дней (12 бакетов по 60 мин, 0–720 мин)."""
        cutoff = int((datetime.now() - timedelta(days=days)).timestamp())
        BUCKET_SIZE = 60
        query = """
            SELECT
                width_bucket((last_seen - first_seen)::numeric / 60, 0, 720, 12) AS bucket,
                COUNT(*) AS cnt
            FROM flights
            WHERE first_seen >= %s
                AND last_seen > first_seen
                AND (last_seen - first_seen) BETWEEN 300 AND 43200
            GROUP BY bucket
            ORDER BY bucket
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(query, [cutoff])
            rows = cursor.fetchall()
        result = []
        for row in rows:
            b = int(row[0])
            result.append({
                'bucket': b,
                'label': f'{(b-1)*BUCKET_SIZE}–{b*BUCKET_SIZE}м',
                'min_min': (b - 1) * BUCKET_SIZE,
                'max_min': b * BUCKET_SIZE,
                'count': row[1],
            })
        return result

    def get_top_airlines_by_flight_count(self, days: int = 7, limit: int = 15) -> List[Dict]:
        """Топ авиакомпаний по числу рейсов (первые 3 буквы позывного = код ИКАО)."""
        cutoff = int((datetime.now() - timedelta(days=days)).timestamp())
        query = """
            SELECT
                LEFT(UPPER(TRIM(callsign)), 3) AS airline_code,
                COUNT(*)                        AS flights
            FROM flights
            WHERE callsign IS NOT NULL
                AND TRIM(callsign) != ''
                AND first_seen >= %s
                AND LEFT(UPPER(TRIM(callsign)), 3) ~ '^[A-Z]{3}$'
            GROUP BY airline_code
            ORDER BY flights DESC
            LIMIT %s
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(query, [cutoff, limit])
            return [{'airline_code': row[0], 'flights': row[1]} for row in cursor.fetchall()]

    def get_airport_daily_trend(self, airport: str, days: int = 14) -> List[Dict]:
        """Ежедневная динамика рейсов через аэропорт за N дней."""
        cutoff = int((datetime.now() - timedelta(days=days)).timestamp())
        airport = airport.upper()
        query = """
            SELECT
                DATE(TO_TIMESTAMP(first_seen))                                  AS flight_date,
                COUNT(CASE WHEN est_departure_airport = %s THEN 1 END)          AS departures,
                COUNT(CASE WHEN est_arrival_airport   = %s THEN 1 END)          AS arrivals,
                COUNT(*)                                                         AS total
            FROM flights
            WHERE first_seen >= %s
                AND (est_departure_airport = %s OR est_arrival_airport = %s)
            GROUP BY flight_date
            ORDER BY flight_date
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(query, [airport, airport, cutoff, airport, airport])
            return [
                {'date': str(row[0]), 'departures': row[1], 'arrivals': row[2], 'total': row[3]}
                for row in cursor.fetchall()
            ]

    def get_vertical_rate_distribution(self) -> List[Dict]:
        """Распределение вертикальных скоростей (набор / снижение / горизонт) в текущем снапшоте."""
        query = """
            SELECT
                CASE
                    WHEN vertical_rate >  5 THEN 'climb'
                    WHEN vertical_rate < -5 THEN 'descent'
                    ELSE 'level'
                END AS phase,
                COUNT(*) AS cnt
            FROM state_vectors
            WHERE snapshot_id = (
                SELECT id FROM snapshots ORDER BY api_timestamp DESC LIMIT 1
            )
                AND vertical_rate IS NOT NULL
                AND on_ground = FALSE
                AND latitude IS NOT NULL
            GROUP BY phase
        """
        with self.db.get_cursor() as cursor:
            cursor.execute(query)
            return [{'phase': row[0], 'count': row[1]} for row in cursor.fetchall()]

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