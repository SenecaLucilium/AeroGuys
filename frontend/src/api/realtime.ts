import client from './client'
import type { AircraftPosition, AirportBusyness } from './types'

// GET /api/realtime/airport-busyness
export async function getAirportBusyness(params?: {
  hours_back?: number
  limit?: number
}): Promise<AirportBusyness[]> {
  const { data } = await client.get<AirportBusyness[]>('/api/realtime/airport-busyness', { params })
  return data
}

// GET /api/realtime/fastest
export async function getFastestAircraft(params?: { limit?: number }): Promise<AircraftPosition[]> {
  const { data } = await client.get<AircraftPosition[]>('/api/realtime/fastest', { params })
  return data
}

// GET /api/realtime/highest
export async function getHighestAircraft(params?: { limit?: number }): Promise<AircraftPosition[]> {
  const { data } = await client.get<AircraftPosition[]>('/api/realtime/highest', { params })
  return data
}
