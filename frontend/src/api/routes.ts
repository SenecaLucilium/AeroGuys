import client from './client'
import type { PopularRoute, RouteEfficiency, DurationBucket, AirlineStat } from './types'

// GET /api/routes/popular
export async function getPopularRoutes(params?: {
  days?: number
  limit?: number
}): Promise<PopularRoute[]> {
  const { data } = await client.get<PopularRoute[]>('/api/routes/popular', { params })
  return data
}

// GET /api/routes/efficiency
export async function getRouteEfficiency(params?: {
  days?: number
  limit?: number
}): Promise<RouteEfficiency[]> {
  const { data } = await client.get<RouteEfficiency[]>('/api/routes/efficiency', { params })
  return data
}

// GET /api/routes/duration-distribution
export async function getDurationDistribution(params?: { days?: number }): Promise<DurationBucket[]> {
  const { data } = await client.get<DurationBucket[]>('/api/routes/duration-distribution', { params })
  return data
}

// GET /api/routes/airlines
export async function getTopAirlines(params?: { days?: number; limit?: number }): Promise<AirlineStat[]> {
  const { data } = await client.get<AirlineStat[]>('/api/routes/airlines', { params })
  return data
}
