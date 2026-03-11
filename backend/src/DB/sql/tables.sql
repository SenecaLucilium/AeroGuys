-- Справочник аэропортов
CREATE TABLE IF NOT EXISTS airports (
    icao        VARCHAR(4)          PRIMARY KEY,
    name        VARCHAR(200),
    latitude    DOUBLE PRECISION    NOT NULL,
    longitude   DOUBLE PRECISION    NOT NULL,
    country     VARCHAR(100),
    city        VARCHAR(100)
);

-- Снимки (каждый вызов get_states)
CREATE TABLE IF NOT EXISTS snapshots (
    id              BIGSERIAL       PRIMARY KEY,
    api_timestamp   BIGINT          NOT NULL,
    aircraft_count  INTEGER         NOT NULL DEFAULT 0,
    bbox_lat_min    DOUBLE PRECISION,
    bbox_lat_max    DOUBLE PRECISION,
    bbox_lon_min    DOUBLE PRECISION,
    bbox_lon_max    DOUBLE PRECISION,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- State vectors
CREATE TABLE IF NOT EXISTS state_vectors (
    id              BIGSERIAL           PRIMARY KEY,
    snapshot_id     BIGINT              NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    icao24          VARCHAR(6)          NOT NULL,
    callsign        VARCHAR(8),
    origin_country  VARCHAR(100)        NOT NULL,
    time_position   BIGINT,
    last_contact    BIGINT              NOT NULL,
    longitude       DOUBLE PRECISION,
    latitude        DOUBLE PRECISION,
    baro_altitude   DOUBLE PRECISION,
    geo_altitude    DOUBLE PRECISION,
    on_ground       BOOLEAN             NOT NULL DEFAULT FALSE,
    velocity        DOUBLE PRECISION,
    true_track      DOUBLE PRECISION,
    vertical_rate   DOUBLE PRECISION,
    squawk          VARCHAR(4),
    spi             BOOLEAN             NOT NULL DEFAULT FALSE,
    position_source SMALLINT            NOT NULL DEFAULT 0,
    category        SMALLINT            NOT NULL DEFAULT 0
);

-- Полёты
CREATE TABLE IF NOT EXISTS flights (
    id                                      BIGSERIAL       PRIMARY KEY,
    icao24                                  VARCHAR(6)      NOT NULL,
    callsign                                VARCHAR(8),
    first_seen                              BIGINT          NOT NULL,
    last_seen                               BIGINT          NOT NULL,
    est_departure_airport                   VARCHAR(4),
    est_arrival_airport                     VARCHAR(4),
    est_departure_airport_horiz_distance    INTEGER,
    est_departure_airport_vert_distance     INTEGER,
    est_arrival_airport_horiz_distance      INTEGER,
    est_arrival_airport_vert_distance       INTEGER,
    departure_airport_candidates_count      INTEGER,
    arrival_airport_candidates_count        INTEGER,
    collected_at                            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_flight UNIQUE (icao24, first_seen, last_seen)
);

-- Треки
CREATE TABLE IF NOT EXISTS flight_tracks (
    id              BIGSERIAL       PRIMARY KEY,
    icao24          VARCHAR(6)      NOT NULL,
    callsign        VARCHAR(8),
    start_time      BIGINT          NOT NULL,
    end_time        BIGINT          NOT NULL,
    collected_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_track UNIQUE (icao24, start_time)
);

-- Точки маршрута
CREATE TABLE IF NOT EXISTS waypoints (
    id              BIGSERIAL           PRIMARY KEY,
    flight_track_id BIGINT              NOT NULL REFERENCES flight_tracks(id) ON DELETE CASCADE,
    time            BIGINT              NOT NULL,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    baro_altitude   DOUBLE PRECISION,
    true_track      DOUBLE PRECISION,
    on_ground       BOOLEAN             NOT NULL DEFAULT FALSE
);