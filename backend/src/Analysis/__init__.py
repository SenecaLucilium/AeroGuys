"""
Analysis module for AeroGuys.
Предоставляет интерфейс для анализа данных из базы данных.
"""

from .queries import DatabaseQueries, FlightInfo, AircraftPosition, AirportStats

__all__ = [
    'DatabaseQueries',
    'FlightInfo',
    'AircraftPosition',
    'AirportStats'
]