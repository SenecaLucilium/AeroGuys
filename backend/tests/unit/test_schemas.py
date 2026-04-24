"""
Юнит-тесты Pydantic-схем (api/schemas/).

Проверяем валидацию входных данных, опциональные поля и граничные случаи.
"""

import sys
from pathlib import Path
from datetime import datetime
import pytest

sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from pydantic import ValidationError


class TestAircraftPositionSchema:
    def _schema_cls(self):
        from api.schemas.realtime import AircraftPositionSchema
        return AircraftPositionSchema

    def _valid_data(self, **overrides):
        data = {
            "icao24": "abc123",
            "callsign": "AFL123",
            "latitude": 55.75,
            "longitude": 37.62,
            "altitude_m": 10000.0,
            "speed_kmh": 900.0,
            "vertical_rate_ms": 0.0,
            "on_ground": False,
            "last_contact": "2026-04-01T12:00:00",
            "origin_country": "Russia",
        }
        data.update(overrides)
        return data

    def test_valid_data_parses(self):
        schema = self._schema_cls()(**self._valid_data())
        assert schema.icao24 == "abc123"

    def test_optional_callsign_none(self):
        schema = self._schema_cls()(**self._valid_data(callsign=None))
        assert schema.callsign is None

    def test_optional_altitude_none(self):
        schema = self._schema_cls()(**self._valid_data(altitude_m=None))
        assert schema.altitude_m is None

    def test_optional_speed_none(self):
        schema = self._schema_cls()(**self._valid_data(speed_kmh=None))
        assert schema.speed_kmh is None

    def test_on_ground_required(self):
        data = self._valid_data()
        del data["on_ground"]
        with pytest.raises(ValidationError):
            self._schema_cls()(**data)

    def test_last_contact_as_datetime_string(self):
        schema = self._schema_cls()(**self._valid_data())
        assert isinstance(schema.last_contact, datetime)

    def test_missing_icao24_raises(self):
        data = self._valid_data()
        del data["icao24"]
        with pytest.raises(ValidationError):
            self._schema_cls()(**data)


class TestAirportInfoSchema:
    def _schema_cls(self):
        from api.schemas.airports import AirportInfoSchema
        return AirportInfoSchema

    def test_valid_data(self):
        schema = self._schema_cls()(
            icao="EDDF",
            name="Frankfurt Airport",
            latitude=50.0333,
            longitude=8.5706,
            country="Germany",
            city="Frankfurt",
        )
        assert schema.icao == "EDDF"

    def test_optional_name_and_city(self):
        schema = self._schema_cls()(
            icao="XXXX",
            latitude=0.0,
            longitude=0.0,
        )
        assert schema.name is None
        assert schema.city is None

    def test_missing_latitude_raises(self):
        with pytest.raises(ValidationError):
            self._schema_cls()(icao="EDDF", longitude=8.5706)


class TestPopularRouteSchema:
    def _schema_cls(self):
        from api.schemas.routes import PopularRouteSchema
        return PopularRouteSchema

    def test_valid_data(self):
        schema = self._schema_cls()(
            departure="EDDF",
            arrival="EGLL",
            flight_count=25,
            avg_duration_minutes=90.0,
            unique_aircraft=12,
        )
        assert schema.departure == "EDDF"
        assert schema.flight_count == 25

    def test_optional_avg_duration(self):
        schema = self._schema_cls()(
            departure="EDDF",
            arrival="EGLL",
            flight_count=5,
            unique_aircraft=3,
        )
        assert schema.avg_duration_minutes is None


class TestDurationBucketSchema:
    def _schema_cls(self):
        from api.schemas.routes import DurationBucketSchema
        return DurationBucketSchema

    def test_valid_data(self):
        schema = self._schema_cls()(
            bucket=1, label="0–60 мин", min_min=0, max_min=60, count=42
        )
        assert schema.count == 42

    def test_missing_count_raises(self):
        with pytest.raises(ValidationError):
            self._schema_cls()(bucket=1, label="0–60 мин", min_min=0, max_min=60)


class TestAirportStatsSchema:
    def _schema_cls(self):
        from api.schemas.airports import AirportStatsSchema
        return AirportStatsSchema

    def test_valid_data(self):
        schema = self._schema_cls()(
            airport="UUEE",
            departures=50,
            arrivals=48,
            total_flights=98,
            first_seen="2026-04-01T00:00:00",
            last_seen="2026-04-01T23:59:00",
        )
        assert schema.airport == "UUEE"
        assert schema.total_flights == 98

    def test_first_seen_is_datetime(self):
        schema = self._schema_cls()(
            airport="UUEE",
            departures=0, arrivals=0, total_flights=0,
            first_seen="2026-04-01T00:00:00",
            last_seen="2026-04-01T23:59:00",
        )
        assert isinstance(schema.first_seen, datetime)


class TestPeakHoursSchema:
    def _schema_cls(self):
        from api.schemas.airports import PeakHoursSchema
        return PeakHoursSchema

    def test_valid_data(self):
        schema = self._schema_cls()(
            airport="EDDF",
            days=7,
            departure={8: 10, 9: 15},
            arrival={8: 8},
        )
        assert schema.departure[8] == 10

    def test_empty_dicts_allowed(self):
        schema = self._schema_cls()(airport="EDDF", days=7, departure={}, arrival={})
        assert schema.departure == {}
