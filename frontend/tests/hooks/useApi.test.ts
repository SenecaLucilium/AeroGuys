/**
 * Тесты хука useApi.
 *
 * useApi — универсальный хук для загрузки данных из API:
 * принимает async-функцию fetcher и возвращает { data, loading, error, refetch }.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useApi } from '../../src/hooks/useApi'

describe('useApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('изначально находится в состоянии загрузки', () => {
    const fetcher = vi.fn(() => new Promise(() => {})) // никогда не резолвится
    const { result } = renderHook(() => useApi(fetcher, []))
    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('возвращает данные после успешного запроса', async () => {
    const mockData = [{ id: 1, name: 'test' }]
    const fetcher = vi.fn().mockResolvedValue(mockData)

    const { result } = renderHook(() => useApi(fetcher, []))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
  })

  it('устанавливает error при ошибке fetcher', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network error'))

    const { result } = renderHook(() => useApi(fetcher, []))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('network error')
    expect(result.current.data).toBeNull()
  })

  it('вызывает fetcher повторно при refetch', async () => {
    const fetcher = vi.fn().mockResolvedValue([])

    const { result } = renderHook(() => useApi(fetcher, []))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(fetcher).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.refetch()
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('сбрасывает ошибку при повторном запросе', async () => {
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(['ok'])

    const { result } = renderHook(() => useApi(fetcher, []))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('fail')

    act(() => { result.current.refetch() })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBeNull()
    expect(result.current.data).toEqual(['ok'])
  })

  it('fetcher вызывается при изменении deps', async () => {
    let dep = 1
    const fetcher = vi.fn().mockResolvedValue([])

    const { result, rerender } = renderHook(() => useApi(fetcher, [dep]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetcher).toHaveBeenCalledTimes(1)

    dep = 2
    rerender()
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })

  it('обрабатывает строковые ошибки (не Error)', async () => {
    const fetcher = vi.fn().mockRejectedValue('string error')

    const { result } = renderHook(() => useApi(fetcher, []))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.error).toBe('string error')
  })
})
