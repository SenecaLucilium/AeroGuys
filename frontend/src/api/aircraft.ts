import client from './client'
import type {
  AircraftPosition, DailyUsage, AircraftRoute,
  AircraftType, AltitudeProfile, ExtremeVerticalRate, BBoxParams,
} from './types'

// GET /api/aircraft/positions
export async function getPositions(params?: BBoxParams & {
  min_altitude?: number
  on_ground?: boolean
  limit?: number
}): Promise<AircraftPosition[]> {
  const { data } = await client.get<AircraftPosition[]>('/api/aircraft/positions', { params })
  return data
}

// GET /api/aircraft/by-callsign/{callsign}
export async function getByCallsign(callsign: string): Promise<AircraftPosition> {
  const { data } = await client.get<AircraftPosition>(`/api/aircraft/by-callsign/${callsign}`)
  return data
}

// GET /api/aircraft/types
export async function getAircraftTypes(params?: BBoxParams & { days?: number }): Promise<AircraftType[]> {
  const { data } = await client.get<AircraftType[]>('/api/aircraft/types', { params })
  return data
}

// GET /api/aircraft/altitude-profile
export async function getAltitudeProfile(): Promise<AltitudeProfile[]> {
  const { data } = await client.get<AltitudeProfile[]>('/api/aircraft/altitude-profile')
  return data
}

// GET /api/aircraft/unidentified
export async function getUnidentifiedAircraft(params?: { limit?: number }): Promise<AircraftPosition[]> {
  const { data } = await client.get<AircraftPosition[]>('/api/aircraft/unidentified', { params })
  return data
}

// GET /api/aircraft/business
export async function getBusinessAviation(params?: { limit?: number }): Promise<AircraftPosition[]> {
  const { data } = await client.get<AircraftPosition[]>('/api/aircraft/business', { params })
  return data
}

// GET /api/aircraft/extreme-vertical-rates
export async function getExtremeVerticalRates(params?: {
  threshold_ms?: number
  limit?: number
}): Promise<ExtremeVerticalRate[]> {
  const { data } = await client.get<ExtremeVerticalRate[]>('/api/aircraft/extreme-vertical-rates', { params })
  return data
}

// GET /api/aircraft/{icao24}/usage
export async function getAircraftUsage(icao24: string, params?: { days?: number }): Promise<DailyUsage[]> {
  const { data } = await client.get<DailyUsage[]>(`/api/aircraft/${icao24}/usage`, { params })
  return data
}

// GET /api/aircraft/{icao24}/routes
export async function getAircraftRoutes(icao24: string, params?: { days?: number; limit?: number }): Promise<AircraftRoute[]> {
  const { data } = await client.get<AircraftRoute[]>(`/api/aircraft/${icao24}/routes`, { params })
  return data
}
