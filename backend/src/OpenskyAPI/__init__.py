"""
OpenSky Network API клиент для AeroGuys.
"""

from .client import OpenskyClient
from .tokenManager import TokenManager
from .models import (
    StateVector,
    OpenSkyStates,
    FlightData,
    FlightTrack,
    Waypoint,
    BoundingBox,
    AircraftCategory,
    PositionSource
)
from .exceptions import (
    OpenskyAPIError,
    RateLimitError,
    AuthenticationError,
    NotFoundError,
    BadRequestError,
    ValidationError,
    NetworkError
)

__all__ = [
    'OpenskyClient',
    'TokenManager',
    'StateVector',
    'OpenSkyStates',
    'FlightData',
    'FlightTrack',
    'Waypoint',
    'BoundingBox',
    'AircraftCategory',
    'PositionSource',
    'OpenskyAPIError',
    'RateLimitError',
    'AuthenticationError',
    'NotFoundError',
    'BadRequestError',
    'ValidationError',
    'NetworkError'
]
