import { useState } from 'react'
import { DataBlock } from '@/components/DataBlock'
import { usePopularRoutes, useRouteEfficiency } from '@hooks/useRoutes'
import { downloadFlightsCsv } from '@api/export'

export default function RoutesPage() {
  const popular    = usePopularRoutes(7, 20)
  const efficiency = useRouteEfficiency(7, 20)

  const [csvStart, setCsvStart] = useState('2026-03-01T00:00:00')
  const [csvEnd,   setCsvEnd]   = useState('2026-03-21T23:59:59')
  const [csvStatus, setCsvStatus] = useState<string | null>(null)

  const handleExport = async () => {
    setCsvStatus('Скачивание…')
    try {
      await downloadFlightsCsv(csvStart, csvEnd)
      setCsvStatus('Готово ✓')
    } catch (e) {
      setCsvStatus(`Ошибка: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return (
    <div>
      <h1>Анализ маршрутов</h1>

      <DataBlock title="Популярные маршруты (7 дней)" {...popular} />
      <DataBlock title="Эффективность маршрутов vs ортодромия (7 дней)" {...efficiency} />

      <section>
        <h2>Экспорт рейсов в CSV</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <label>
            Начало:&nbsp;
            <input value={csvStart} onChange={(e) => setCsvStart(e.target.value)} style={{ width: 180 }} />
          </label>
          <label>
            Конец:&nbsp;
            <input value={csvEnd} onChange={(e) => setCsvEnd(e.target.value)} style={{ width: 180 }} />
          </label>
          <button onClick={handleExport}>Скачать CSV</button>
          {csvStatus && <span>{csvStatus}</span>}
        </div>
      </section>
    </div>
  )
}
