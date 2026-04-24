/**
 * Тесты API-модуля realtime.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

vi.mock('axios')

const mockAxios = axios as typeof axios & { create: ReturnType<typeof vi.fn> }
const mockGet = vi.fn()
const mockInstance = {
  get: mockGet,
  interceptors: { response: { use: vi.fn() }, request: { use: vi.fn() } },
}
mockAxios.create = vi.fn(() => mockInstance as any)
mockAxios.isAxiosError = vi.fn(() => false) as any

const { getAirportBusyness, getCityBusyness, getFastestAircraft, getHighestAircraft } =
  await import('../../src/api/realtime')

describe('realtime API', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('getAirportBusyness', () => {
    it('вызывает GET /api/realtime/airport-busyness', async () => {
      mockGet.mockResolvedValue({ data: [] })
      await getAirportBusyness()
      expect(mockGet).toHaveBeenCalledWith('/api/realtime/airport-busyness', { params: undefined })
    })

    it('передаёт параметры hours_back и limit', async () => {
      mockGet.mockResolvedValue({ data: [] })
      await getAirportBusyness({ hours_back: 48, limit: 10 })
      expect(mockGet).toHaveBeenCalledWith('/api/realtime/airport-busyness', {
        params: { hours_back: 48, limit: 10 },
      })
    })
  })

  describe('getCityBusyness', () => {
    it('вызывает GET /api/realtime/city-busyness', async () => {
      mockGet.mockResolvedValue({ data: [] })
      await getCityBusyness()
      expect(mockGet).toHaveBeenCalledWith('/api/realtime/city-busyness', { params: undefined })
    })
  })

  describe('getFastestAircraft', () => {
    it('вызывает GET /api/realtime/fastest', async () => {
      mockGet.mockResolvedValue({ data: [] })
      await getFastestAircraft()
      expect(mockGet).toHaveBeenCalledWith('/api/realtime/fastest', { params: undefined })
    })

    it('передаёт limit', async () => {
      mockGet.mockResolvedValue({ data: [] })
      await getFastestAircraft({ limit: 5 })
      expect(mockGet).toHaveBeenCalledWith('/api/realtime/fastest', { params: { limit: 5 } })
    })
  })

  describe('getHighestAircraft', () => {
    it('вызывает GET /api/realtime/highest', async () => {
      mockGet.mockResolvedValue({ data: [] })
      await getHighestAircraft()
      expect(mockGet).toHaveBeenCalledWith('/api/realtime/highest', { params: undefined })
    })
  })
})
