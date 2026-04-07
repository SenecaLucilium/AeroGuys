import { useApi } from './useApi'
import {
  getAirportStats, getAirportPeakHours,
  getAirportDestinations, getAirportThroughput, getAirportDailyTrend,
} from '@api/airports'

export const useAirportStats = (days = 7) =>
  useApi(() => getAirportStats({ days }), [days])

export const useAirportPeakHours = (icao: string, days = 7) =>
  useApi(() => getAirportPeakHours(icao, { days }), [icao, days])

export const useAirportDestinations = (icao: string, days = 7) =>
  useApi(() => getAirportDestinations(icao, { days }), [icao, days])

export const useAirportThroughput = (airports: string[], days = 7) =>
  useApi(() => getAirportThroughput(airports, { days }), [airports.join(','), days])

export const useAirportDailyTrend = (icao: string, days = 14) =>
  useApi(() => getAirportDailyTrend(icao, { days }), [icao, days])
