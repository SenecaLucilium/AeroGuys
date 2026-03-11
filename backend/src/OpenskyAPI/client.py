import time
import logging
from typing import Optional, List, Union, Dict, Any
from datetime import datetime

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .tokenManager import TokenManager
from .models import ( OpenSkyStates, FlightData, FlightTrack, BoundingBox )
from .exceptions import ( OpenskyAPIError, RateLimitError, AuthenticationError, BadRequestError, NetworkError )

logger = logging.getLogger(__name__)

class OpenskyClient:
    """Низкоуровневый REST клиент для OpenSky Network API"""

    BASE_URL = "https://opensky-network.org/api"

    # Ограничения API
    MAX_HISTORY_HOURS = 1
    MAX_FLIGHTS_INTERVAL_HOURS = 2
    MAX_FLIGHTS_AIRCRAFT_DAYS = 2
    MAX_TRACK_DAYS = 30

    def __init__(self, token_manager: TokenManager, timeout: int = 30, max_retries: int = 3, retry_backoff: float = 1.0):
        self.token_manager = token_manager
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_backoff = retry_backoff
        
        self.session = self._create_session()
        
        self.last_request_time: Optional[float] = None
        self.remaining_credits: Optional[int] = None
    
    def _create_session(self) -> requests.Session:
        session = requests.Session()
        
        retry_strategy = Retry(
            total=self.max_retries,
            backoff_factor=self.retry_backoff,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["GET"]
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
    
    def _make_request(self, endpoint: str, params: Optional[Dict[str, Any]] = None, require_auth: bool = True) -> Optional[Dict]:
        url = f"{self.BASE_URL}{endpoint}"
        headers = self.token_manager.headers() if require_auth else {}
        
        logger.debug(f"Request: {endpoint} with params: {params}")
        
        try:
            response = self.session.get(url, params=params, headers=headers, timeout=self.timeout)
            
            self._track_rate_limits(response)
            
            if response.status_code == 200:
                self.last_request_time = time.time()
                return response.json()
            elif response.status_code == 404:
                logger.debug(f"No data found for {endpoint}")
                return None
            elif response.status_code == 429:
                retry_after = self._get_retry_after(response)
                logger.warning(f"Rate limit exceeded. Retry after {retry_after}s")
                raise RateLimitError(f"Rate limit exceeded. Retry after {retry_after}s", retry_after=retry_after)
            elif response.status_code == 401:
                logger.error("Authentication failed")
                raise AuthenticationError("Authentication failed. Check your credentials.")
            elif response.status_code == 400:
                logger.error(f"Bad request: {response.text}")
                raise BadRequestError(f"Bad request: {response.text}")
            else:
                logger.error(f"API error {response.status_code}: {response.text}")
                raise OpenskyAPIError(f"API request failed with status {response.status_code}")
        
        except requests.exceptions.Timeout:
            raise NetworkError(f"Request timeout after {self.timeout}s")
        
        except requests.exceptions.ConnectionError as e:
            raise NetworkError(f"Connection error: {str(e)}")
        
        except requests.exceptions.RequestException as e:
            raise OpenskyAPIError(f"Request failed: {str(e)}")
    
    def _track_rate_limits(self, response: requests.Response):
        if 'X-Rate-Limit-Remaining' in response.headers:
            try:
                self.remaining_credits = int(response.headers['X-Rate-Limit-Remaining'])
                logger.debug(f"Remaining API credits: {self.remaining_credits}")
            except ValueError:
                pass
    
    def _get_retry_after(self, response: requests.Response) -> int:
        if 'X-Rate-Limit-Retry-After-Seconds' in response.headers:
            try:
                return int(response.headers['X-Rate-Limit-Retry-After-Seconds'])
            except ValueError:
                pass
        return 60
    
    def get_states(self, time_secs: Optional[int] = None, icao24: Optional[Union[str, List[str]]] = None, bbox: Optional[BoundingBox] = None) -> Optional[OpenSkyStates]:
        params = {}
        
        if time_secs is not None:
            max_past = int(time.time()) - (self.MAX_HISTORY_HOURS * 3600)
            if time_secs < max_past:
                raise BadRequestError(f"Time parameter too far in the past. " f"Max {self.MAX_HISTORY_HOURS} hour(s) ago.")
            params['time'] = time_secs
        
        if icao24:
            icao_list = [icao24] if isinstance(icao24, str) else icao24
            params['icao24'] = [i.lower() for i in icao_list]
        
        if bbox:
            params['lamin'] = bbox.lat_min
            params['lamax'] = bbox.lat_max
            params['lomin'] = bbox.lon_min
            params['lomax'] = bbox.lon_max
        
        params['extended'] = 1
        
        data = self._make_request('/states/all', params=params)
        return OpenSkyStates.from_api_response(data) if data else None
    
    def get_flights_in_interval(self, begin: int, end: int) -> Optional[List[FlightData]]:
        interval_hours = (end - begin) / 3600
        if interval_hours > self.MAX_FLIGHTS_INTERVAL_HOURS:
            raise BadRequestError(f"Time interval too large. " f"Max {self.MAX_FLIGHTS_INTERVAL_HOURS} hours.")
        
        params = {'begin': begin, 'end': end}
        data = self._make_request('/flights/all', params=params)
        
        if data:
            return [FlightData.from_api_dict(f) for f in data]
        return None
    
    def get_flights_by_aircraft(self, icao24: str, begin: int, end: int) -> Optional[List[FlightData]]:
        interval_days = (end - begin) / 86400
        if interval_days > self.MAX_FLIGHTS_AIRCRAFT_DAYS:
            raise BadRequestError(f"Time interval too large. " f"Max {self.MAX_FLIGHTS_AIRCRAFT_DAYS} days.")
        
        params = {'icao24': icao24.lower(), 'begin': begin, 'end': end}
        data = self._make_request('/flights/aircraft', params=params)
        
        if data:
            return [FlightData.from_api_dict(f) for f in data]
        return None
    
    def get_arrivals_by_airport(self, airport: str, begin: int, end: int) -> Optional[List[FlightData]]:
        interval_hours = (end - begin) / 3600
        if interval_hours > 48:
            raise BadRequestError("Time interval too large. Max 2 days.")
        
        params = {'airport': airport.upper(), 'begin': begin, 'end': end}
        data = self._make_request('/flights/arrival', params=params)
        
        if data:
            return [FlightData.from_api_dict(f) for f in data]
        return None
    
    def get_departures_by_airport(self, airport: str, begin: int, end: int) -> Optional[List[FlightData]]:
        interval_hours = (end - begin) / 3600
        if interval_hours > 48:
            raise BadRequestError("Time interval too large. Max 2 days.")
        
        params = {'airport': airport.upper(), 'begin': begin, 'end': end}
        data = self._make_request('/flights/departure', params=params)
        
        if data:
            return [FlightData.from_api_dict(f) for f in data]
        return None
    
    def get_track_by_aircraft(self, icao24: str, time: int = 0) -> Optional[FlightTrack]:
        if time > 0:
            max_past = int(datetime.now().timestamp()) - (self.MAX_TRACK_DAYS * 86400)
            if time < max_past:
                raise BadRequestError(f"Track data not available. Max {self.MAX_TRACK_DAYS} days ago.")
        
        params = {'icao24': icao24.lower(), 'time': time}
        data = self._make_request('/tracks/all', params=params)
        
        return FlightTrack.from_api_response(data) if data else None
    
    def get_remaining_credits(self) -> Optional[int]:
        return self.remaining_credits
    
    def wait_if_rate_limited(self, retry_after: int):
        logger.info(f"Rate limited. Waiting {retry_after} seconds...")
        time.sleep(retry_after)