import { useApi } from './useApi'
import { getAirportBusyness, getFastestAircraft, getHighestAircraft } from '@api/realtime'

export const useAirportBusyness = (hours_back = 24, limit = 20) =>
  useApi(() => getAirportBusyness({ hours_back, limit }), [hours_back, limit])

export const useFastestAircraft = (limit = 20) =>
  useApi(() => getFastestAircraft({ limit }), [limit])

export const useHighestAircraft = (limit = 20) =>
  useApi(() => getHighestAircraft({ limit }), [limit])
