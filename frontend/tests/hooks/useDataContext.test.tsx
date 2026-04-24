/**
 * Тесты DataContext (useDataContext + DataProvider).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'
import { DataProvider, useDataContext } from '../../src/context/DataContext'
import type { InitInfo } from '../../src/context/DataContext'

// Мокаем fetch для проверки статуса БД
const mockFetch = vi.fn()
global.fetch = mockFetch

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(DataProvider, null, children)
}

describe('DataContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    // По умолчанию БД пустая
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ has_data: false }),
    } as Response)
  })

  it('начальное состояние — initInfo равен null', async () => {
    const { result } = renderHook(() => useDataContext(), { wrapper })
    expect(result.current.initInfo).toBeNull()
  })

  it('setInitialized сохраняет данные в state и localStorage', () => {
    const { result } = renderHook(() => useDataContext(), { wrapper })

    const info: InitInfo = {
      mode: 'realtime',
      states_loaded: 100,
      flights_loaded: 50,
      message: 'OK',
    }

    act(() => {
      result.current.setInitialized(info)
    })

    expect(result.current.initInfo).toEqual(info)
    const stored = JSON.parse(localStorage.getItem('aeroguys_init') ?? 'null')
    expect(stored).toEqual(info)
  })

  it('reset очищает state и localStorage', () => {
    const { result } = renderHook(() => useDataContext(), { wrapper })

    act(() => {
      result.current.setInitialized({ mode: 'csv', flights_loaded: 10 })
    })
    expect(result.current.initInfo).not.toBeNull()

    act(() => {
      result.current.reset()
    })

    expect(result.current.initInfo).toBeNull()
    expect(localStorage.getItem('aeroguys_init')).toBeNull()
  })

  it('восстанавливает состояние из localStorage при монтировании', () => {
    const info: InitInfo = { mode: 'realtime', states_loaded: 42 }
    localStorage.setItem('aeroguys_init', JSON.stringify(info))

    const { result } = renderHook(() => useDataContext(), { wrapper })
    expect(result.current.initInfo).toEqual(info)
  })

  it('сбрасывает состояние если API сообщает has_data=false', async () => {
    const info: InitInfo = { mode: 'realtime', states_loaded: 42 }
    localStorage.setItem('aeroguys_init', JSON.stringify(info))

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ has_data: false }),
    } as Response)

    const { result } = renderHook(() => useDataContext(), { wrapper })

    // Ждём, пока useEffect обработает ответ fetch
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(result.current.initInfo).toBeNull()
  })

  it('не сбрасывает состояние если API сообщает has_data=true', async () => {
    const info: InitInfo = { mode: 'realtime', states_loaded: 42 }
    localStorage.setItem('aeroguys_init', JSON.stringify(info))

    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ has_data: true }),
    } as Response)

    const { result } = renderHook(() => useDataContext(), { wrapper })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    expect(result.current.initInfo).toEqual(info)
  })

  it('корректно обрабатывает повреждённый JSON в localStorage', () => {
    localStorage.setItem('aeroguys_init', 'invalid json{')
    // Не должно выбрасывать исключение
    expect(() => {
      renderHook(() => useDataContext(), { wrapper })
    }).not.toThrow()
  })
})
