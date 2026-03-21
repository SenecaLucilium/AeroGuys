import client from './client'
import type { PopularRoute, RouteEfficiency } from './types'

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
