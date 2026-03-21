import { useState } from 'react'
import { DataBlock } from '@/components/DataBlock'
import {
  usePositions, useAircraftTypes, useAltitudeProfile,
  useUnidentifiedAircraft, useBusinessAviation,
  useExtremeVerticalRates, useAircraftUsage, useAircraftRoutes,
} from '@hooks/useAircraft'

const DEFAULT_ICAO24 = '3c6444' // пример: Lufthansa A320

export default function AircraftPage() {
  const [icao24, setIcao24] = useState(DEFAULT_ICAO24)
  const [inputIcao24, setInputIcao24] = useState(DEFAULT_ICAO24)

  const positions      = usePositions({ limit: 100 })
  const types          = useAircraftTypes({ days: 7 })
  const altProfile     = useAltitudeProfile()
  const unidentified   = useUnidentifiedAircraft(50)
  const business       = useBusinessAviation(50)
  const extremeRates   = useExtremeVerticalRates(10, 30)
  const usage          = useAircraftUsage(icao24, 30)
  const routes         = useAircraftRoutes(icao24, 30, 10)

  return (
    <div>
      <h1>Анализ воздушных судов</h1>

      <div style={{ marginBottom: 24 }}>
        <label>
          ICAO24 борта:&nbsp;
          <input
            value={inputIcao24}
            onChange={(e) => setInputIcao24(e.target.value.toLowerCase())}
            maxLength={6}
            style={{ width: 100, marginRight: 8 }}
          />
        </label>
        <button onClick={() => setIcao24(inputIcao24)}>Применить</button>
        &nbsp;<small>Текущий: <strong>{icao24}</strong></small>
      </div>

      <DataBlock title="Текущие позиции (100 бортов)" {...positions} />
      <DataBlock title="Популярные типы ВС (7 дней)" {...types} />
      <DataBlock title="Высотный профиль типов ВС" {...altProfile} />
      <DataBlock title="Военные / неопознанные борты" {...unidentified} />
      <DataBlock title="Бизнес-авиация" {...business} />
      <DataBlock title="Резкие наборы / снижения высоты (≥10 м/с)" {...extremeRates} />
      <DataBlock title={`Налёт борта ${icao24} (30 дней)`} {...usage} />
      <DataBlock title={`Маршруты борта ${icao24} (30 дней)`} {...routes} />
    </div>
  )
}
