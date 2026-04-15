import { useApi } from './useApi'
import {
  getPositions, getAircraftTypes, getAltitudeProfile,
  getUnidentifiedAircraft, getBusinessAviation,
  getExtremeVerticalRates, getAircraftUsage, getAircraftRoutes,
  getSpeedDistribution, getAltitudeDistribution, getCountryDistribution,
  getSnapshotStats, getFlightPhases, getAircraftHistory,
} from '@api/aircraft'
import type { BBoxParams } from '@api/types'

export const usePositions = (params?: BBoxParams & { min_altitude?: number; on_ground?: boolean; limit?: number }) =>
  useApi(() => getPositions(params), [JSON.stringify(params)])

export const useAircraftTypes = (params?: BBoxParams & { days?: number }) =>
  useApi(() => getAircraftTypes(params), [JSON.stringify(params)])

export const useAltitudeProfile = () =>
  useApi(() => getAltitudeProfile(), [])

export const useUnidentifiedAircraft = (limit = 100) =>
  useApi(() => getUnidentifiedAircraft({ limit }), [limit])

export const useBusinessAviation = (limit = 100) =>
  useApi(() => getBusinessAviation({ limit }), [limit])

export const useExtremeVerticalRates = (threshold_ms = 10, limit = 50) =>
  useApi(() => getExtremeVerticalRates({ threshold_ms, limit }), [threshold_ms, limit])

export const useAircraftUsage = (icao24: string, days = 30) =>
  useApi(() => getAircraftUsage(icao24, { days }), [icao24, days])

export const useAircraftRoutes = (icao24: string, days = 30, limit = 10) =>
  useApi(() => getAircraftRoutes(icao24, { days, limit }), [icao24, days, limit])

export const useSpeedDistribution = () =>
  useApi(() => getSpeedDistribution(), [])

export const useAltitudeDistribution = () =>
  useApi(() => getAltitudeDistribution(), [])

export const useCountryDistribution = (limit = 15) =>
  useApi(() => getCountryDistribution({ limit }), [limit])

export const useSnapshotStats = () =>
  useApi(() => getSnapshotStats(), [])

export const useFlightPhases = () =>
  useApi(() => getFlightPhases(), [])

export const useAircraftHistory = (icao24: string, limit = 100) =>
  useApi(() => getAircraftHistory(icao24, { limit }), [icao24, limit])
