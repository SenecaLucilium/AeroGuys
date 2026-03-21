import client from './client'
import type { AirportStats, PeakHours, Destination, Throughput } from './types'

// GET /api/airports/stats
export async function getAirportStats(params?: { days?: number }): Promise<AirportStats[]> {
  const { data } = await client.get<AirportStats[]>('/api/airports/stats', { params })
  return data
}

// GET /api/airports/{icao}/peak-hours
export async function getAirportPeakHours(icao: string, params?: { days?: number }): Promise<PeakHours> {
  const { data } = await client.get<PeakHours>(`/api/airports/${icao}/peak-hours`, { params })
  return data
}

// GET /api/airports/{icao}/destinations
export async function getAirportDestinations(icao: string, params?: { days?: number }): Promise<Destination[]> {
  const { data } = await client.get<Destination[]>(`/api/airports/${icao}/destinations`, { params })
  return data
}

// GET /api/airports/throughput
// axios сериализует массив как airports=X&airports=Y
export async function getAirportThroughput(airports: string[], params?: { days?: number }): Promise<Throughput[]> {
  const { data } = await client.get<Throughput[]>('/api/airports/throughput', {
    params: { airports, ...params },
    // axios по умолчанию serializes arrays as airports[]=X; FastAPI ожидает airports=X&airports=Y
    paramsSerializer: (p) => {
      const sp = new URLSearchParams()
      ;(p.airports as string[]).forEach((a) => sp.append('airports', a))
      if (p.days !== undefined) sp.append('days', String(p.days))
      return sp.toString()
    },
  })
  return data
}
