import { useApi } from './useApi'
import { getPopularRoutes, getRouteEfficiency } from '@api/routes'

export const usePopularRoutes = (days = 7, limit = 20) =>
  useApi(() => getPopularRoutes({ days, limit }), [days, limit])

export const useRouteEfficiency = (days = 7, limit = 20) =>
  useApi(() => getRouteEfficiency({ days, limit }), [days, limit])
