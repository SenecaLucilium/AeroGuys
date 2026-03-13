import time
import logging
from datetime import datetime

from OpenskyAPI.client import OpenskyClient
from OpenskyAPI.tokenManager import TokenManager
from OpenskyAPI.exceptions import RateLimitError, OpenskyAPIError
from DB.dbManager import DatabaseManager

from .config import PollingConfig
from .storage import DataStorage

logger = logging.getLogger(__name__)

class DataCollector:
    """Основной класс для сбора данных из OpenSky API и сохранения в БД"""
    
    def __init__(self, db: DatabaseManager, token_manager: TokenManager, config: PollingConfig):
        self.db = db
        self.config = config 
        self.client = OpenskyClient(token_manager)
        self.storage = DataStorage(db)
    
    def run_poll(self) -> dict:
        """Выполнить один цикл сбора данных"""
        logger.info("=" * 70)
        logger.info(f"Starting polling at {datetime.now()}")
        logger.info("=" * 70)
        
        stats = {
            'timestamp': datetime.now().isoformat(),
            'states_collected': 0,
            'flights_collected': 0,
            'tracks_collected': 0,
            'errors': []
        }
        
        if self.config.collect_states:
            states_count = self._collect_states()
            stats['states_collected'] = states_count
        
        if self.config.collect_flights:
            flights_count = self._collect_flights()
            stats['flights_collected'] = flights_count
        
        if self.config.collect_tracks and self.config.track_icao24_list:
            tracks_count = self._collect_tracks()
            stats['tracks_collected'] = tracks_count
        
        logger.info("=" * 70)
        logger.info("Polling completed")
        logger.info(f"States: {stats['states_collected']}")
        logger.info(f"Flights: {stats['flights_collected']}")
        logger.info(f"Tracks: {stats['tracks_collected']}")
        logger.info("=" * 70)
        
        return stats
    
    def _collect_states(self) -> int:
        logger.info("Collecting state vectors...")
        
        try:
            states_data = self.client.get_states(bbox=self.config.states_bbox)
            
            if not states_data or not states_data.states:
                logger.warning("No states received from API")
                return 0
            
            snapshot_id = self.storage.create_snapshot(
                api_timestamp=states_data.time,
                aircraft_count=len(states_data.states),
                bbox=self.config.states_bbox
            )
            
            if not snapshot_id:
                logger.error("Failed to create snapshot")
                return 0
            
            saved = self.storage.save_state_vectors(snapshot_id, states_data.states)
            
            logger.info(f"✓ Collected {saved} state vectors")
            return saved
        
        except RateLimitError as e:
            logger.warning(f"Rate limited: {e}")
            if e.retry_after:
                logger.info(f"Waiting {e.retry_after} seconds...")
                time.sleep(e.retry_after)
            return 0
        
        except OpenskyAPIError as e:
            logger.error(f"API error while collecting states: {e}")
            return 0
        
        except Exception as e:
            logger.error(f"Unexpected error collecting states: {e}", exc_info=True)
            return 0
    
    def _collect_flights(self) -> int:
        logger.info(f"Collecting flights (last {self.config.flights_hours_back}h)...")
        
        try:
            end_time = int(datetime.now().timestamp())
            begin_time = end_time - (self.config.flights_hours_back * 3600)
            
            flights = self.client.get_flights_in_interval(begin_time, end_time)
            
            if not flights:
                logger.warning("No flights received from API")
                return 0
            
            saved = self.storage.save_flights(flights)
            
            logger.info(f"✓ Collected {saved} flights")
            return saved
        
        except RateLimitError as e:
            logger.warning(f"Rate limited: {e}")
            if e.retry_after:
                time.sleep(e.retry_after)
            return 0
        
        except OpenskyAPIError as e:
            logger.error(f"API error while collecting flights: {e}")
            return 0
        
        except Exception as e:
            logger.error(f"Unexpected error collecting flights: {e}", exc_info=True)
            return 0
    
    def _collect_airport_data(self):
        logger.info("Collecting airport data...")
        
        total_arrivals = 0
        total_departures = 0
        
        end_time = int(datetime.now().timestamp())
        begin_time = end_time - 3600
        
        for airport in self.config.airports_to_track:
            try:
                arrivals = self.client.get_arrivals_by_airport(
                    airport, begin_time, end_time
                )
                if arrivals:
                    saved_arr = self.storage.save_flights(arrivals)
                    total_arrivals += saved_arr
                    logger.debug(f"  {airport}: {saved_arr} arrivals")
                
                time.sleep(1)
                
                departures = self.client.get_departures_by_airport(
                    airport, begin_time, end_time
                )
                if departures:
                    saved_dep = self.storage.save_flights(departures)
                    total_departures += saved_dep
                    logger.debug(f"  {airport}: {saved_dep} departures")
                
                time.sleep(1)
            
            except RateLimitError as e:
                logger.warning(f"Rate limited on {airport}: {e}")
                if e.retry_after:
                    time.sleep(e.retry_after)
                break
            
            except OpenskyAPIError as e:
                logger.error(f"API error for {airport}: {e}")
                continue
        
        logger.info(f"✓ Airport data: {total_arrivals} arrivals, {total_departures} departures")
        return total_arrivals + total_departures
    
    def _collect_tracks(self) -> int:
        logger.info("Collecting flight tracks...")
        
        total_saved = 0
        
        for icao24 in self.config.track_icao24_list:
            try:
                track = self.client.get_track_by_aircraft(icao24, time=0)
                
                if track:
                    track_id = self.storage.save_flight_track(track)
                    if track_id:
                        total_saved += 1
                        logger.debug(f"  Saved track for {icao24}")
                
                time.sleep(1)
            
            except RateLimitError as e:
                logger.warning(f"Rate limited: {e}")
                if e.retry_after:
                    time.sleep(e.retry_after)
                break
            
            except OpenskyAPIError as e:
                logger.error(f"API error for track {icao24}: {e}")
                continue
        
        logger.info(f"✓ Collected {total_saved} tracks")
        return total_saved