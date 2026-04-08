/**
 * Скачивает CSV с рейсами за указанный период.
 * Браузер создаёт ссылку с blob URL и кликает по ней.
 */
export async function downloadFlightsCsv(start: string, end: string): Promise<void> {
  const params = new URLSearchParams({ start, end })
  const response = await fetch(`/api/export/flights?${params}`)

  if (!response.ok) {
    throw new Error(`Export failed: ${response.status} ${response.statusText}`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `flights_${start.slice(0, 10)}_${end.slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/** Скачивает все сырые рейсы из БД (полные столбцы) в CSV. */
export async function downloadRawCsv(): Promise<void> {
  const response = await fetch('/api/export/raw')

  if (!response.ok) {
    throw new Error(`Export failed: ${response.status} ${response.statusText}`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'raw_flights.csv'
  a.click()
  URL.revokeObjectURL(url)
}

/** Скачивает ZIP-архив со всеми аналитическими CSV. */
export async function downloadAnalyticsCsv(): Promise<void> {
  const response = await fetch('/api/export/analytics')

  if (!response.ok) {
    throw new Error(`Export failed: ${response.status} ${response.statusText}`)
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const today = new Date().toISOString().slice(0, 10)
  a.download = `aeroguys_analytics_${today}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
