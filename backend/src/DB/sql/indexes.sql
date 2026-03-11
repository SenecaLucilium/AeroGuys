-- snapshots
CREATE INDEX IF NOT EXISTS idx_snapshots_api_ts       ON snapshots(api_timestamp);

-- state_vectors: real-time аналитика
CREATE INDEX IF NOT EXISTS idx_sv_snapshot             ON state_vectors(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_sv_icao24               ON state_vectors(icao24);
CREATE INDEX IF NOT EXISTS idx_sv_last_contact         ON state_vectors(last_contact);
CREATE INDEX IF NOT EXISTS idx_sv_position             ON state_vectors(latitude, longitude)    WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sv_velocity             ON state_vectors(velocity DESC NULLS LAST) WHERE velocity IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sv_altitude             ON state_vectors(baro_altitude DESC NULLS LAST) WHERE baro_altitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sv_category             ON state_vectors(category);
CREATE INDEX IF NOT EXISTS idx_sv_no_callsign          ON state_vectors(snapshot_id)             WHERE callsign IS NULL;
CREATE INDEX IF NOT EXISTS idx_sv_squawk               ON state_vectors(squawk)                  WHERE squawk IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sv_callsign             ON state_vectors(callsign)                WHERE callsign IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sv_vrate                ON state_vectors(vertical_rate)           WHERE vertical_rate IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sv_on_ground            ON state_vectors(on_ground, latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- flights: аэропортная и маршрутная аналитика
CREATE INDEX IF NOT EXISTS idx_fl_arrival_airport      ON flights(est_arrival_airport, last_seen)   WHERE est_arrival_airport IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fl_departure_airport    ON flights(est_departure_airport, first_seen) WHERE est_departure_airport IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fl_route                ON flights(est_departure_airport, est_arrival_airport) WHERE est_departure_airport IS NOT NULL AND est_arrival_airport IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fl_icao24               ON flights(icao24, first_seen);
CREATE INDEX IF NOT EXISTS idx_fl_callsign             ON flights(callsign)                      WHERE callsign IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fl_first_seen           ON flights(first_seen);

-- flight_tracks + waypoints
CREATE INDEX IF NOT EXISTS idx_ft_icao24               ON flight_tracks(icao24, start_time);
CREATE INDEX IF NOT EXISTS idx_wp_track                ON waypoints(flight_track_id);
CREATE INDEX IF NOT EXISTS idx_wp_position             ON waypoints(latitude, longitude)          WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- airports
CREATE INDEX IF NOT EXISTS idx_airports_position       ON airports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_airports_country        ON airports(country);