import client from './client'
import type { AircraftPosition, AirportBusyness, CityBusyness } from './types'

// GET /api/realtime/airport-busyness
export async function getAirportBusyness(params?: {
  hours_back?: number
  limit?: number
}): Promise<AirportBusyness[]> {
  const { data } = await client.get<AirportBusyness[]>('/api/realtime/airport-busyness', { params })
  return data
}

// GET /api/realtime/city-busyness
export async function getCityBusyness(params?: {
  hours_back?: number
  limit?: number
}): Promise<CityBusyness[]> {
  const { data } = await client.get<CityBusyness[]>('/api/realtime/city-busyness', { params })
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
