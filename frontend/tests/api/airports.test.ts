/**
 * Тесты API-модуля airports.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

vi.mock('axios')

const mockAxios = axios as typeof axios & {
  create: ReturnType<typeof vi.fn>
}

const mockGet = vi.fn()
const mockInstance = {
  get: mockGet,
  interceptors: {
    response: { use: vi.fn() },
    request: { use: vi.fn() },
  },
}
mockAxios.create = vi.fn(() => mockInstance as any)
mockAxios.isAxiosError = vi.fn(() => false) as any

const {
  getAirportStats,
  getAirportInfo,
  getAirportPeakHours,
  getAirportDestinations,
  getAirportDailyTrend,
  getAirportThroughput,
} = await import('../../src/api/airports')

const STATS_STUB = {
  airport: 'EDDF',
  departures: 100,
  arrivals: 98,
  total_flights: 198,
  first_seen: '2026-04-01T00:00:00',
  last_seen: '2026-04-08T00:00:00',
}

describe('airports API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAirportStats', () => {
    it('вызывает GET /api/airports/stats', async () => {
      mockGet.mockResolvedValue({ data: [STATS_STUB] })

      const result = await getAirportStats()

      expect(mockGet).toHaveBeenCalledWith('/api/airports/stats', { params: undefined })
      expect(result).toEqual([STATS_STUB])
    })

    it('передаёт параметр days', async () => {
      mockGet.mockResolvedValue({ data: [] })

      await getAirportStats({ days: 14 })

      expect(mockGet).toHaveBeenCalledWith('/api/airports/stats', { params: { days: 14 } })
    })

    it('возвращает пустой массив при отсутствии данных', async () => {
      mockGet.mockResolvedValue({ data: [] })
      expect(await getAirportStats()).toEqual([])
    })
  })

  describe('getAirportInfo', () => {
    it('вызывает GET /api/airports/:icao/info', async () => {
      const info = { icao: 'EDDF', name: 'Frankfurt', latitude: 50.0, longitude: 8.5, country: 'Germany', city: 'Frankfurt' }
      mockGet.mockResolvedValue({ data: info })

      const result = await getAirportInfo('EDDF')

      expect(mockGet).toHaveBeenCalledWith('/api/airports/EDDF/info')
      expect(result.icao).toBe('EDDF')
    })

    it('передаёт правильный ICAO в URL', async () => {
      mockGet.mockResolvedValue({ data: {} })
      await getAirportInfo('UUEE')
      expect(mockGet).toHaveBeenCalledWith('/api/airports/UUEE/info')
    })
  })

  describe('getAirportPeakHours', () => {
    it('вызывает GET /api/airports/:icao/peak-hours', async () => {
      const peak = { airport: 'EDDF', days: 7, departure: { '8': 10 }, arrival: { '8': 8 } }
      mockGet.mockResolvedValue({ data: peak })

      await getAirportPeakHours('EDDF')

      expect(mockGet).toHaveBeenCalledWith('/api/airports/EDDF/peak-hours', { params: undefined })
    })

    it('передаёт параметр days', async () => {
      mockGet.mockResolvedValue({ data: {} })
      await getAirportPeakHours('EDDF', { days: 30 })
      expect(mockGet).toHaveBeenCalledWith('/api/airports/EDDF/peak-hours', { params: { days: 30 } })
    })
  })

  describe('getAirportDestinations', () => {
    it('вызывает GET /api/airports/:icao/destinations', async () => {
      mockGet.mockResolvedValue({ data: [] })
      await getAirportDestinations('EDDF')
      expect(mockGet).toHaveBeenCalledWith('/api/airports/EDDF/destinations', { params: undefined })
    })
  })

  describe('getAirportDailyTrend', () => {
    it('вызывает корректный URL', async () => {
      mockGet.mockResolvedValue({ data: [] })
      await getAirportDailyTrend('EGLL', { days: 14 })
      expect(mockGet).toHaveBeenCalledWith('/api/airports/EGLL/daily-trend', { params: { days: 14 } })
    })
  })

  describe('getAirportThroughput', () => {
    it('вызывает GET /api/airports/throughput с custom serializer', async () => {
      mockGet.mockResolvedValue({ data: [] })
      await getAirportThroughput(['EDDF', 'EGLL'])
      // Главное — что вызов произошёл с правильным base URL
      expect(mockGet).toHaveBeenCalledWith('/api/airports/throughput', expect.any(Object))
    })

    it('возвращает массив', async () => {
      mockGet.mockResolvedValue({ data: [{ airport: 'EDDF', total_flights: 100, departures: 50, arrivals: 50, avg_flights_per_hour: 4.2 }] })
      const result = await getAirportThroughput(['EDDF'])
      expect(Array.isArray(result)).toBe(true)
      expect(result[0].airport).toBe('EDDF')
    })
  })
})
