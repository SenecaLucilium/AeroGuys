import { useState } from 'react'
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, Chip,
} from '@mui/material'
import FlightIcon        from '@mui/icons-material/Flight'
import SearchIcon        from '@mui/icons-material/Search'
import ArrowUpwardIcon   from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { SectionCard } from '@/components/DataBlock'
import {
  usePositions, useAircraftTypes, useAltitudeProfile,
  useUnidentifiedAircraft, useBusinessAviation,
  useExtremeVerticalRates, useAircraftUsage, useAircraftRoutes,
} from '@hooks/useAircraft'
import type {
  AircraftPosition, AircraftType, AltitudeProfile,
  ExtremeVerticalRate, DailyUsage, AircraftRoute,
} from '@api/types'

const DEFAULT_ICAO24 = '3c6444'

// ─── Shared components ───────────────────────────────────────────────────────

function PositionsTable({ data }: { data: AircraftPosition[] }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ICAO24</TableCell>
            <TableCell>Позывной</TableCell>
            <TableCell>Страна</TableCell>
            <TableCell align="right">Высота, м</TableCell>
            <TableCell align="right">Скорость, км/ч</TableCell>
            <TableCell align="right">В/скор., м/с</TableCell>
            <TableCell>Статус</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={`${row.icao24}-${i}`}>
              <TableCell>
                <Typography fontFamily="monospace" fontSize={12} color="secondary.main">
                  {row.icao24}
                </Typography>
              </TableCell>
              <TableCell>
                {row.callsign
                  ? <Typography variant="body2" fontWeight={500}>{row.callsign.trim()}</Typography>
                  : <Typography color="text.disabled" variant="body2">—</Typography>}
              </TableCell>
              <TableCell sx={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.origin_country}
              </TableCell>
              <TableCell align="right">
                {row.altitude_m != null
                  ? Math.round(row.altitude_m).toLocaleString()
                  : '—'}
              </TableCell>
              <TableCell align="right">
                {row.speed_kmh != null
                  ? <Typography color="warning.main" fontWeight={700}>{Math.round(row.speed_kmh)}</Typography>
                  : '—'}
              </TableCell>
              <TableCell align="right">
                {row.vertical_rate_ms != null ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.4 }}>
                    {row.vertical_rate_ms > 0.5
                      ? <ArrowUpwardIcon sx={{ fontSize: 12, color: 'success.main' }} />
                      : row.vertical_rate_ms < -0.5
                        ? <ArrowDownwardIcon sx={{ fontSize: 12, color: 'error.main' }} />
                        : null}
                    <Typography variant="body2">{row.vertical_rate_ms.toFixed(1)}</Typography>
                  </Box>
                ) : '—'}
              </TableCell>
              <TableCell>
                {row.on_ground
                  ? <Chip label="Земля" size="small" variant="outlined" sx={{ fontSize: 11 }} />
                  : <Chip label="Воздух" size="small" color="success" variant="outlined" sx={{ fontSize: 11 }} />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function TypesTable({ data }: { data: AircraftType[] }) {
  const sorted = [...data].sort((a, b) => b.observations - a.observations)
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Кат.</TableCell>
            <TableCell>Тип ВС</TableCell>
            <TableCell align="right">Уникальных ВС</TableCell>
            <TableCell align="right">Наблюдений</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map(row => (
            <TableRow key={row.category}>
              <TableCell>
                <Chip label={row.category} size="small" color="primary" variant="outlined" />
              </TableCell>
              <TableCell>{row.category_name}</TableCell>
              <TableCell align="right">
                <Typography fontWeight={600}>{row.unique_aircraft.toLocaleString()}</Typography>
              </TableCell>
              <TableCell align="right">{row.observations.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function AltitudeProfileTable({ data }: { data: AltitudeProfile[] }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Тип ВС</TableCell>
            <TableCell align="right">Ср. высота, м</TableCell>
            <TableCell align="right">Медиана высоты, м</TableCell>
            <TableCell align="right">Ср. скорость, км/ч</TableCell>
            <TableCell align="right">Выборка</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map(row => (
            <TableRow key={row.category}>
              <TableCell>{row.category_name}</TableCell>
              <TableCell align="right">
                {row.avg_altitude_m != null
                  ? Math.round(row.avg_altitude_m).toLocaleString()
                  : '—'}
              </TableCell>
              <TableCell align="right">
                {row.median_altitude_m != null
                  ? Math.round(row.median_altitude_m).toLocaleString()
                  : '—'}
              </TableCell>
              <TableCell align="right">
                {row.avg_speed_kmh != null
                  ? <Typography color="warning.main">{Math.round(row.avg_speed_kmh)}</Typography>
                  : '—'}
              </TableCell>
              <TableCell align="right">{row.sample_aircraft.toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function ExtremeRatesTable({ data }: { data: ExtremeVerticalRate[] }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>ICAO24</TableCell>
            <TableCell>Позывной</TableCell>
            <TableCell>Страна</TableCell>
            <TableCell align="right">Высота, м</TableCell>
            <TableCell align="right">Скорость, км/ч</TableCell>
            <TableCell align="right">В/скор., м/с</TableCell>
            <TableCell>Тип</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={`${row.icao24}-${i}`}>
              <TableCell>
                <Typography fontFamily="monospace" fontSize={12} color="secondary.main">
                  {row.icao24}
                </Typography>
              </TableCell>
              <TableCell>{row.callsign?.trim() ?? '—'}</TableCell>
              <TableCell sx={{ maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.origin_country}
              </TableCell>
              <TableCell align="right">
                {row.altitude_m != null ? Math.round(row.altitude_m).toLocaleString() : '—'}
              </TableCell>
              <TableCell align="right">{row.speed_kmh != null ? Math.round(row.speed_kmh) : '—'}</TableCell>
              <TableCell align="right">
                <Typography
                  fontWeight={700}
                  color={row.direction === 'climb' ? 'success.main' : 'error.main'}
                >
                  {row.direction === 'climb' ? '+' : ''}{row.vertical_rate_ms.toFixed(1)}
                </Typography>
              </TableCell>
              <TableCell>
                {row.direction === 'climb'
                  ? <Chip icon={<ArrowUpwardIcon />} label="Набор" size="small" color="success" />
                  : <Chip icon={<ArrowDownwardIcon />} label="Снижение" size="small" color="error" />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function UsageTable({ data }: { data: DailyUsage[] }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Дата</TableCell>
            <TableCell align="right">Рейсов</TableCell>
            <TableCell align="right">Часов налёта</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map(row => (
            <TableRow key={row.date}>
              <TableCell>
                <Typography fontFamily="monospace" variant="body2">{row.date}</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight={600}>{row.flights}</Typography>
              </TableCell>
              <TableCell align="right">{row.total_hours.toFixed(1)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function RoutesTable({ data }: { data: AircraftRoute[] }) {
  const sorted = [...data].sort((a, b) => b.times_flown - a.times_flown)
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Откуда</TableCell>
            <TableCell>Куда</TableCell>
            <TableCell align="right">Выполнено</TableCell>
            <TableCell align="right">Ср. время, мин</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((row, i) => (
            <TableRow key={i}>
              <TableCell>
                <Typography fontFamily="monospace" color="primary.main" fontWeight={700} variant="body2">
                  {row.departure ?? '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography fontFamily="monospace" color="primary.main" fontWeight={700} variant="body2">
                  {row.arrival ?? '—'}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight={700}>{row.times_flown}</Typography>
              </TableCell>
              <TableCell align="right">
                {row.avg_duration_minutes != null ? Math.round(row.avg_duration_minutes) : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AircraftPage() {
  const [icao24, setIcao24] = useState(DEFAULT_ICAO24)
  const [input,  setInput]  = useState(DEFAULT_ICAO24)

  const positions    = usePositions({ limit: 100 })
  const types        = useAircraftTypes({ days: 7 })
  const altProfile   = useAltitudeProfile()
  const unidentified = useUnidentifiedAircraft(50)
  const business     = useBusinessAviation(50)
  const extremeRates = useExtremeVerticalRates(10, 30)
  const usage        = useAircraftUsage(icao24, 30)
  const routes       = useAircraftRoutes(icao24, 30, 10)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <FlightIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5">Воздушные суда</Typography>
          <Typography variant="body2" color="text.secondary">
            Позиции, типы, профили и аналитика по бортам
          </Typography>
        </Box>
      </Box>

      {/* ICAO24 picker */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          label="ICAO24 борта"
          value={input}
          onChange={(e) => setInput(e.target.value.toLowerCase())}
          inputProps={{ maxLength: 6, style: { fontFamily: 'monospace', letterSpacing: 1 } }}
          size="small"
          sx={{ width: 160 }}
        />
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={() => setIcao24(input)}
          disabled={input.length < 6}
        >
          Применить
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">Выбран:</Typography>
          <Chip
            label={icao24}
            color="warning"
            size="small"
            variant="filled"
            sx={{ fontFamily: 'monospace' }}
          />
        </Box>
      </Box>

      <SectionCard
        title="Текущие позиции (100 бортов)"
        loading={positions.loading} error={positions.error} refetch={positions.refetch}
        count={positions.data?.length}
      >
        {positions.data && <PositionsTable data={positions.data} />}
      </SectionCard>

      <SectionCard
        title="Популярные типы ВС (7 дней)"
        loading={types.loading} error={types.error} refetch={types.refetch}
        count={types.data?.length}
      >
        {types.data && <TypesTable data={types.data} />}
      </SectionCard>

      <SectionCard
        title="Высотно-скоростной профиль по типам"
        loading={altProfile.loading} error={altProfile.error} refetch={altProfile.refetch}
      >
        {altProfile.data && <AltitudeProfileTable data={altProfile.data} />}
      </SectionCard>

      <SectionCard
        title="Военные / неопознанные борты"
        loading={unidentified.loading} error={unidentified.error} refetch={unidentified.refetch}
        count={unidentified.data?.length}
      >
        {unidentified.data && <PositionsTable data={unidentified.data} />}
      </SectionCard>

      <SectionCard
        title="Бизнес-авиация"
        loading={business.loading} error={business.error} refetch={business.refetch}
        count={business.data?.length}
      >
        {business.data && <PositionsTable data={business.data} />}
      </SectionCard>

      <SectionCard
        title="Резкие наборы / снижения высоты (≥10 м/с)"
        loading={extremeRates.loading} error={extremeRates.error} refetch={extremeRates.refetch}
        count={extremeRates.data?.length}
      >
        {extremeRates.data && <ExtremeRatesTable data={extremeRates.data} />}
      </SectionCard>

      <SectionCard
        title={`Налёт борта ${icao24} (30 дней)`}
        loading={usage.loading} error={usage.error} refetch={usage.refetch}
      >
        {usage.data && <UsageTable data={usage.data} />}
      </SectionCard>

      <SectionCard
        title={`Типичные маршруты борта ${icao24} (30 дней)`}
        loading={routes.loading} error={routes.error} refetch={routes.refetch}
        count={routes.data?.length}
      >
        {routes.data && <RoutesTable data={routes.data} />}
      </SectionCard>
    </Box>
  )
}

