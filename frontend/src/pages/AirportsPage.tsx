import { useState } from 'react'
import { DataBlock } from '@/components/DataBlock'
import {
  useAirportStats, useAirportPeakHours,
  useAirportDestinations, useAirportThroughput,
} from '@hooks/useAirports'

const DEFAULT_AIRPORT = 'EDDF'
const COMPARE_AIRPORTS = ['EDDF', 'LFPG', 'EGLL']

export default function AirportsPage() {
  const [icao, setIcao] = useState(DEFAULT_AIRPORT)
  const [inputIcao, setInputIcao] = useState(DEFAULT_AIRPORT)

  const stats        = useAirportStats(7)
  const peakHours    = useAirportPeakHours(icao, 7)
  const destinations = useAirportDestinations(icao, 7)
  const throughput   = useAirportThroughput(COMPARE_AIRPORTS, 7)

  return (
    <div>
      <h1>Анализ аэропортов</h1>

      <div style={{ marginBottom: 24 }}>
        <label>
          ICAO-код аэропорта:&nbsp;
          <input
            value={inputIcao}
            onChange={(e) => setInputIcao(e.target.value.toUpperCase())}
            maxLength={4}
            style={{ width: 80, marginRight: 8 }}
          />
        </label>
        <button onClick={() => setIcao(inputIcao)}>Применить</button>
        &nbsp;<small>Текущий: <strong>{icao}</strong></small>
      </div>

      <DataBlock title="Рейтинг аэропортов (7 дней)" {...stats} />
      <DataBlock title={`Пиковые часы — ${icao} (7 дней)`} {...peakHours} />
      <DataBlock title={`Направления из ${icao} (7 дней)`} {...destinations} />
      <DataBlock title={`Пропускная способность: ${COMPARE_AIRPORTS.join(', ')}`} {...throughput} />
    </div>
  )
}
