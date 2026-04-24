"""
Юнит-тесты доменных моделей (dataclasses) из Analysis/queries.py.

Проверяют корректность парсинга строк из БД.
"""

import sys
from pathlib import Path
from datetime import datetime
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from Analysis.queries import AircraftPosition, FlightInfo


class TestAircraftPositionFromDbRow:
    """Тесты фабричного метода AircraftPosition.from_db_row."""

    def _make_row(self, **overrides):
        row = [
            "abc123",        # icao24
            "AFL123",        # callsign
            55.75,           # latitude
            37.62,           # longitude
            10000.0,         # baro_altitude (м)
            250.0,           # velocity (м/с)
            1.5,             # vertical_rate
            False,           # on_ground
            1743508800,      # last_contact (Unix timestamp)
            "Russia",        # origin_country
        ]
        for k, v in overrides.items():
            idx = {
                "icao24": 0, "callsign": 1, "latitude": 2, "longitude": 3,
                "altitude": 4, "velocity": 5, "vertical_rate": 6,
                "on_ground": 7, "last_contact": 8, "origin_country": 9,
            }[k]
            row[idx] = v
        return row

    def test_icao24_parsed(self):
        pos = AircraftPosition.from_db_row(self._make_row())
        assert pos.icao24 == "abc123"

    def test_callsign_parsed(self):
        pos = AircraftPosition.from_db_row(self._make_row())
        assert pos.callsign == "AFL123"

    def test_callsign_none_when_null(self):
        pos = AircraftPosition.from_db_row(self._make_row(callsign=None))
        assert pos.callsign is None

    def test_coordinates_parsed(self):
        pos = AircraftPosition.from_db_row(self._make_row())
        assert pos.latitude == 55.75
        assert pos.longitude == 37.62

    def test_altitude_parsed(self):
        pos = AircraftPosition.from_db_row(self._make_row(altitude=12500.0))
        assert pos.altitude == 12500.0

    def test_speed_converted_mps_to_kmh(self):
        """velocity в БД хранится в м/с, должна конвертироваться в км/ч."""
        pos = AircraftPosition.from_db_row(self._make_row(velocity=250.0))
        assert abs(pos.speed - 250.0 * 3.6) < 0.01

    def test_speed_none_when_velocity_null(self):
        pos = AircraftPosition.from_db_row(self._make_row(velocity=None))
        assert pos.speed is None

    def test_on_ground_true(self):
        pos = AircraftPosition.from_db_row(self._make_row(on_ground=True))
        assert pos.on_ground is True

    def test_on_ground_false(self):
        pos = AircraftPosition.from_db_row(self._make_row(on_ground=False))
        assert pos.on_ground is False

    def test_last_contact_is_datetime(self):
        pos = AircraftPosition.from_db_row(self._make_row(last_contact=1743508800))
        assert isinstance(pos.last_contact, datetime)

    def test_origin_country_parsed(self):
        pos = AircraftPosition.from_db_row(self._make_row(origin_country="Germany"))
        assert pos.origin_country == "Germany"


class TestFlightInfoFromDbRow:
    """Тесты фабричного метода FlightInfo.from_db_row."""

    def _make_row(self, **overrides):
        row = [
            1,               # id
            "abc123",        # icao24
            "AFL123",        # callsign
            1743508800,      # first_seen (Unix)
            1743508800 + 7200,  # last_seen (Unix, +2 часа)
            "UUEE",          # est_departure_airport
            "EDDF",          # est_arrival_airport
        ]
        for k, v in overrides.items():
            idx = {
                "id": 0, "icao24": 1, "callsign": 2,
                "first_seen": 3, "last_seen": 4,
                "departure_airport": 5, "arrival_airport": 6,
            }[k]
            row[idx] = v
        return row

    def test_id_parsed(self):
        fi = FlightInfo.from_db_row(self._make_row())
        assert fi.id == 1

    def test_icao24_parsed(self):
        fi = FlightInfo.from_db_row(self._make_row())
        assert fi.icao24 == "abc123"

    def test_callsign_parsed(self):
        fi = FlightInfo.from_db_row(self._make_row())
        assert fi.callsign == "AFL123"

    def test_first_seen_is_datetime(self):
        fi = FlightInfo.from_db_row(self._make_row())
        assert isinstance(fi.first_seen, datetime)

    def test_last_seen_is_datetime(self):
        fi = FlightInfo.from_db_row(self._make_row())
        assert isinstance(fi.last_seen, datetime)

    def test_duration_minutes_calculated(self):
        fi = FlightInfo.from_db_row(self._make_row())
        assert abs(fi.duration_minutes - 120.0) < 0.01

    def test_duration_zero_when_same_time(self):
        ts = 1743508800
        fi = FlightInfo.from_db_row(self._make_row(first_seen=ts, last_seen=ts))
        assert fi.duration_minutes == 0.0

    def test_departure_airport(self):
        fi = FlightInfo.from_db_row(self._make_row())
        assert fi.departure_airport == "UUEE"

    def test_arrival_airport(self):
        fi = FlightInfo.from_db_row(self._make_row())
        assert fi.arrival_airport == "EDDF"

    def test_airports_can_be_none(self):
        fi = FlightInfo.from_db_row(self._make_row(departure_airport=None, arrival_airport=None))
        assert fi.departure_airport is None
        assert fi.arrival_airport is None
