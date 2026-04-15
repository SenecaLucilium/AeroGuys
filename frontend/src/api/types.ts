/**
 * TypeScript-типы, зеркально отражающие Pydantic-схемы бэкенда.
 * При изменении схем бэкенда — обновлять здесь.
 */

// ─── Реальное время ──────────────────────────────────────────────────────────

export interface AircraftPosition {
  icao24: string
  callsign: string | null
  latitude: number
  longitude: number
  altitude_m: number | null
  speed_kmh: number | null
  vertical_rate_ms: number | null
  on_ground: boolean
  last_contact: string // ISO-8601 datetime
  origin_country: string
}

export interface AirportBusyness {
  airport: string
  departures: number
  arrivals: number
  total_flights: number
  first_seen: string
  last_seen: string
}

export interface CityBusyness {
  city: string
  country: string
  departures: number
  arrivals: number
  total_flights: number
  first_seen: string
  last_seen: string
}

// ─── Аэропорты ───────────────────────────────────────────────────────────────

export interface AirportStats {
  airport: string
  departures: number
  arrivals: number
  total_flights: number
  first_seen: string
  last_seen: string
}

/** Ключ — час 0–23, значение — число рейсов */
export interface PeakHours {
  airport: string
  days: number
  departure: Record<number, number>
  arrival: Record<number, number>
}

export interface Destination {
  destination: string
  country: string | null
  airport_name: string | null
  latitude: number | null
  longitude: number | null
  flight_count: number
}

export interface Throughput {
  airport: string
  total_flights: number
  departures: number
  arrivals: number
  avg_flights_per_hour: number
}

// ─── Воздушные суда ──────────────────────────────────────────────────────────

export interface DailyUsage {
  date: string
  flights: number
  total_hours: number
}

export interface AircraftRoute {
  departure: string | null
  arrival: string | null
  times_flown: number
  avg_duration_minutes: number | null
}

export interface AircraftType {
  category: number
  category_name: string
  unique_aircraft: number
  observations: number
}

export interface AltitudeProfile {
  category: number
  category_name: string
  avg_altitude_m: number | null
  avg_speed_kmh: number | null
  median_altitude_m: number | null
  sample_aircraft: number
}

export interface ExtremeVerticalRate {
  icao24: string
  callsign: string | null
  latitude: number
  longitude: number
  altitude_m: number | null
  speed_kmh: number | null
  vertical_rate_ms: number
  direction: 'climb' | 'descent'
  last_contact: string
  origin_country: string
}

// ─── Маршруты ────────────────────────────────────────────────────────────────

export interface PopularRoute {
  departure: string
  arrival: string
  flight_count: number
  avg_duration_minutes: number | null
  unique_aircraft: number
}

export interface RouteEfficiency {
  departure: string
  arrival: string
  flight_count: number
  avg_duration_minutes: number | null
  great_circle_km: number
  estimated_actual_km: number | null
  route_efficiency_pct: number | null
}

// ─── Общие вспомогательные типы ──────────────────────────────────────────────

/** Параметры bbox для фильтрации по географии */
export interface BBoxParams {
  min_lat?: number
  max_lat?: number
  min_lon?: number
  max_lon?: number
}

// ─── Распределения и агрегаты (снапшот) ────────────────────────────────────

export interface SpeedBucket {
  bucket: number
  label: string
  min_kmh: number
  max_kmh: number
  count: number
}

export interface AltitudeBucket {
  bucket: number
  label: string
  min_m: number
  max_m: number
  count: number
}

export interface CountryCount {
  country: string
  aircraft_count: number
}

export interface SnapshotStats {
  total: number
  airborne: number
  on_ground: number
  max_speed_kmh: number | null
  max_altitude_m: number | null
  countries_count: number
}

export interface FlightPhase {
  phase: 'climb' | 'descent' | 'level'
  count: number
}

// ─── Маршруты (доп.) ──────────────────────────────────────────────────────────

export interface DurationBucket {
  bucket: number
  label: string
  min_min: number
  max_min: number
  count: number
}

export interface AirlineStat {
  airline_code: string
  flights: number
}

// ─── Аэропорты (доп.) ────────────────────────────────────────────────────────

export interface DailyTrend {
  date: string
  departures: number
  arrivals: number
  total: number
}

export interface AirportInfo {
  icao: string
  name: string | null
  latitude: number
  longitude: number
  country: string | null
  city: string | null
}

// ─── Воздушные суда (история) ─────────────────────────────────────────────────

export interface FlightHistory {
  icao24: string
  callsign: string | null
  first_seen: string | null
  last_seen: string | null
  departure: string | null
  arrival: string | null
  duration_minutes: number | null
}
