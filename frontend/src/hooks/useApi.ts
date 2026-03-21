import { useState, useEffect, useCallback } from 'react'

export interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => void
}

/**
 * Универсальный хук для вызова любой async API-функции.
 *
 * @param fetcher  - async-функция, возвращающая данные
 * @param deps     - зависимости useEffect (пересчитывают запрос при изменении)
 *
 * @example
 *   const { data, loading, error } = useApi(() => getFastestAircraft({ limit: 10 }), [])
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
): ApiState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetcher()
      .then((result) => { if (!cancelled) setData(result) })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err)
          setError(msg)
        }
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  // deps + tick управляют повторными запросами
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, loading, error, refetch }
}
