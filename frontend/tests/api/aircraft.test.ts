/**
 * Тесты API-модуля aircraft.ts.
 *
 * Мокаем axios-клиент, чтобы не делать реальных HTTP-запросов.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'

vi.mock('axios')

const mockAxios = axios as typeof axios & {
  create: ReturnType<typeof vi.fn>
}

// Мок инстанса axios
const mockGet = vi.fn()
const mockPost = vi.fn()
const mockInstance = {
  get: mockGet,
  post: mockPost,
  interceptors: {
    response: { use: vi.fn() },
    request: { use: vi.fn() },
  },
}
mockAxios.create = vi.fn(() => mockInstance as any)
mockAxios.isAxiosError = vi.fn(() => false) as any

// Импортируем после мока
const { getPositions, getByCallsign, getAircraftTypes } = await import('../../src/api/aircraft')

const AIRCRAFT_STUB = {
  icao24: 'abc123',
  callsign: 'AFL123',
  latitude: 55.75,
  longitude: 37.62,
  altitude_m: 10000,
  speed_kmh: 900,
  vertical_rate_ms: 0,
  on_ground: false,
  last_contact: '2026-04-01T12:00:00',
  origin_country: 'Russia',
}

describe('aircraft API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPositions', () => {
    it('вызывает GET /api/aircraft/positions', async () => {
      mockGet.mockResolvedValue({ data: [AIRCRAFT_STUB] })

      const result = await getPositions()

      expect(mockGet).toHaveBeenCalledWith('/api/aircraft/positions', { params: undefined })
      expect(result).toEqual([AIRCRAFT_STUB])
    })

    it('передаёт bbox-параметры', async () => {
      mockGet.mockResolvedValue({ data: [] })

      await getPositions({ min_lat: 50, max_lat: 60, min_lon: 30, max_lon: 40 })

      expect(mockGet).toHaveBeenCalledWith('/api/aircraft/positions', {
        params: { min_lat: 50, max_lat: 60, min_lon: 30, max_lon: 40 },
      })
    })

    it('возвращает пустой массив если данных нет', async () => {
      mockGet.mockResolvedValue({ data: [] })

      const result = await getPositions()
      expect(result).toEqual([])
    })

    it('бросает ошибку при сетевой ошибке', async () => {
      mockGet.mockRejectedValue(new Error('Network Error'))

      await expect(getPositions()).rejects.toThrow('Network Error')
    })
  })

  describe('getByCallsign', () => {
    it('вызывает GET /api/aircraft/by-callsign/:callsign', async () => {
      mockGet.mockResolvedValue({ data: AIRCRAFT_STUB })

      const result = await getByCallsign('AFL123')

      expect(mockGet).toHaveBeenCalledWith('/api/aircraft/by-callsign/AFL123')
      expect(result.icao24).toBe('abc123')
    })

    it('передаёт позывной в URL', async () => {
      mockGet.mockResolvedValue({ data: AIRCRAFT_STUB })

      await getByCallsign('DLH100')

      expect(mockGet).toHaveBeenCalledWith('/api/aircraft/by-callsign/DLH100')
    })
  })

  describe('getAircraftTypes', () => {
    it('вызывает GET /api/aircraft/types', async () => {
      const types = [{ category: 1, category_name: 'No info', unique_aircraft: 5, observations: 20 }]
      mockGet.mockResolvedValue({ data: types })

      const result = await getAircraftTypes()

      expect(mockGet).toHaveBeenCalledWith('/api/aircraft/types', { params: undefined })
      expect(result).toEqual(types)
    })
  })
})
