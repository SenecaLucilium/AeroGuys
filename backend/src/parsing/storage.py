import logging
from typing import List, Optional
from datetime import datetime

from DB.dbManager import DatabaseManager
from OpenskyAPI.models import StateVector, FlightData, FlightTrack, Waypoint, BoundingBox

logger = logging.getLogger(__name__)

class DataStorage:
    """Класс для сохранения данных polling PostgresSQL"""

    def __init__(self, db: DatabaseManager):
        self.db = db
    
    def create_snapshot(self, api_timestamp: int, aircraft_count: int, bbox: Optional[BoundingBox] = None) -> Optional[int]:
        """Создать snapshot (запись о сборе)"""
        try:
            query = """
                INSERT INTO snapshots 
                    (api_timestamp, aircraft_count, bbox_lat_min, bbox_lat_max, 
                     bbox_lon_min, bbox_lon_max)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
            """
            
            params = (
                api_timestamp,
                aircraft_count,
                bbox.lat_min if bbox else None,
                bbox.lat_max if bbox else None,
                bbox.lon_min if bbox else None,
                bbox.lon_max if bbox else None
            )
            
            with self.db.get_cursor() as cursor:
                cursor.execute(query, params)
                snapshot_id = cursor.fetchone()[0]
            
            logger.info(f"Created snapshot {snapshot_id} with {aircraft_count} aircraft")
            return snapshot_id
        
        except Exception as e:
            logger.error(f"Failed to create snapshot: {e}")
            return None
    
    def save_state_vectors(self, snapshot_id: int, states: List[StateVector]) -> int:
        """Сохранить state vectors пачкой"""

        if not states:
            return 0
        
        try:
            query = """
                INSERT INTO state_vectors (
                    snapshot_id, icao24, callsign, origin_country, time_position,
                    last_contact, longitude, latitude, baro_altitude, geo_altitude,
                    on_ground, velocity, true_track, vertical_rate, squawk, spi,
                    position_source, category
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            
            # Подготовка данных для batch insert
            values = [
                (
                    snapshot_id,
                    s.icao24,
                    s.callsign,
                    s.origin_country,
                    s.time_position,
                    s.last_contact,
                    s.longitude,
                    s.latitude,
                    s.baro_altitude,
                    s.geo_altitude,
                    s.on_ground,
                    s.velocity,
                    s.true_track,
                    s.vertical_rate,
                    s.squawk,
                    s.spi,
                    s.position_source,
                    s.category
                )
                for s in states
            ]
            
            with self.db.get_cursor() as cursor:
                cursor.executemany(query, values)
            
            logger.info(f"Saved {len(states)} state vectors for snapshot {snapshot_id}")
            return len(states)
        
        except Exception as e:
            logger.error(f"Failed to save state vectors: {e}")
            return 0
    
    def save_flights(self, flights: List[FlightData]) -> int:
        """Сохранить flights с дедупликацией"""

        if not flights:
            return 0
        
        try:
            query = """
                INSERT INTO flights (
                    icao24, callsign, first_seen, last_seen,
                    est_departure_airport, est_arrival_airport,
                    est_departure_airport_horiz_distance, est_departure_airport_vert_distance,
                    est_arrival_airport_horiz_distance, est_arrival_airport_vert_distance,
                    departure_airport_candidates_count, arrival_airport_candidates_count
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (icao24, first_seen, last_seen) DO NOTHING
            """
            
            values = [
                (
                    f.icao24,
                    f.callsign,
                    f.first_seen,
                    f.last_seen,
                    f.est_departure_airport,
                    f.est_arrival_airport,
                    f.est_departure_airport_horiz_distance,
                    f.est_departure_airport_vert_distance,
                    f.est_arrival_airport_horiz_distance,
                    f.est_arrival_airport_vert_distance,
                    f.departure_airport_candidates_count,
                    f.arrival_airport_candidates_count
                )
                for f in flights
            ]
            
            with self.db.get_cursor() as cursor:
                cursor.executemany(query, values)
                saved = cursor.rowcount
            
            logger.info(f"Saved {saved} flights (duplicates skipped)")
            return saved
        
        except Exception as e:
            logger.error(f"Failed to save flights: {e}")
            return 0

    def save_flight_track(self, track: FlightTrack) -> Optional[int]:
        """Сохранить flight track с waypoints"""

        try:
            query = """
                INSERT INTO flight_tracks (icao24, callsign, start_time, end_time)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (icao24, start_time) DO NOTHING
                RETURNING id
            """
            
            with self.db.get_cursor() as cursor:
                cursor.execute(query, (
                    track.icao24,
                    track.callsign,
                    track.start_time,
                    track.end_time
                ))
                
                result = cursor.fetchone()
                if not result:
                    logger.debug(f"Track {track.icao24} already exists")
                    return None
                
                track_id = result[0]
                
                # Сохранить waypoints
                if track.path:
                    self._save_waypoints(cursor, track_id, track.path)
                
                logger.info(f"Saved track {track_id} with {len(track.path)} waypoints")
                return track_id
        
        except Exception as e:
            logger.error(f"Failed to save track: {e}")
            return None
    
    def _save_waypoints(self, cursor, track_id: int, waypoints: List[Waypoint]):
        """Сохранить waypoints"""

        query = """
            INSERT INTO waypoints (
                flight_track_id, time, latitude, longitude,
                baro_altitude, true_track, on_ground
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        
        values = [
            (
                track_id,
                w.time,
                w.latitude,
                w.longitude,
                w.baro_altitude,
                w.true_track,
                w.on_ground
            )
            for w in waypoints
        ]
        
        cursor.executemany(query, values)
    
    def get_storage_stats(self) -> dict:
        """Получить статистику по хранилищу"""
        try:
            with self.db.get_cursor() as cursor:
                # Проверка существования таблиц
                cursor.execute("""
                    SELECT COUNT(*) 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'snapshots'
                """)
                
                if cursor.fetchone()[0] == 0:
                    logger.warning("Database schema not initialized")
                    return {
                        'snapshots': 0,
                        'state_vectors': 0,
                        'flights': 0,
                        'flight_tracks': 0,
                        'waypoints': 0
                    }
                
                cursor.execute("""
                    SELECT 
                        (SELECT COUNT(*) FROM snapshots) as snapshots,
                        (SELECT COUNT(*) FROM state_vectors) as state_vectors,
                        (SELECT COUNT(*) FROM flights) as flights,
                        (SELECT COUNT(*) FROM flight_tracks) as tracks,
                        (SELECT COUNT(*) FROM waypoints) as waypoints
                """)
                
                row = cursor.fetchone()
                return {
                    'snapshots': row[0],
                    'state_vectors': row[1],
                    'flights': row[2],
                    'flight_tracks': row[3],
                    'waypoints': row[4]
                }
        
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {
                'snapshots': 0,
                'state_vectors': 0,
                'flights': 0,
                'flight_tracks': 0,
                'waypoints': 0
            }