import { DataBlock } from '@/components/DataBlock'
import { useAirportBusyness, useFastestAircraft, useHighestAircraft } from '@hooks/useRealtime'

export default function RealtimePage() {
  const busyness = useAirportBusyness(24, 20)
  const fastest  = useFastestAircraft(20)
  const highest  = useHighestAircraft(20)

  return (
    <div>
      <h1>Мониторинг в реальном времени</h1>

      <DataBlock title="Рейтинг загруженности аэропортов (24 ч)" {...busyness} />
      <DataBlock title="Самые быстрые самолёты (топ 20)" {...fastest} />
      <DataBlock title="Самые высокие полёты (топ 20)" {...highest} />
    </div>
  )
}
