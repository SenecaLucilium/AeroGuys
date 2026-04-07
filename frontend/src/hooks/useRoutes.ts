import { useApi } from './useApi'
import { getPopularRoutes, getRouteEfficiency, getDurationDistribution, getTopAirlines } from '@api/routes'

export const usePopularRoutes = (days = 7, limit = 20) =>
  useApi(() => getPopularRoutes({ days, limit }), [days, limit])

export const useRouteEfficiency = (days = 7, limit = 20) =>
  useApi(() => getRouteEfficiency({ days, limit }), [days, limit])

export const useDurationDistribution = (days = 7) =>
  useApi(() => getDurationDistribution({ days }), [days])

export const useTopAirlines = (days = 7, limit = 15) =>
  useApi(() => getTopAirlines({ days, limit }), [days, limit])
