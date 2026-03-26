import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip,
} from '@mui/material'
import RadarIcon        from '@mui/icons-material/Radar'
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'
import FlightLandIcon    from '@mui/icons-material/FlightLand'
import ArrowUpwardIcon   from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import { SectionCard } from '@/components/DataBlock'
import { useAirportBusyness, useFastestAircraft, useHighestAircraft } from '@hooks/useRealtime'
import type { AircraftPosition, AirportBusyness } from '@api/types'

function BusynessTable({ data }: { data: AirportBusyness[] }) {
  const max = Math.max(...data.map(d => d.total_flights), 1)
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }}>#</TableCell>
            <TableCell>Аэропорт</TableCell>
            <TableCell align="right">
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                <FlightTakeoffIcon sx={{ fontSize: 14 }} />Вылеты
              </Box>
            </TableCell>
            <TableCell align="right">
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                <FlightLandIcon sx={{ fontSize: 14 }} />Прилёты
              </Box>
            </TableCell>
            <TableCell align="right">Всего</TableCell>
            <TableCell sx={{ minWidth: 130 }}>Активность</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={row.airport}>
              <TableCell sx={{ color: 'text.secondary' }}>{i + 1}</TableCell>
              <TableCell>
                <Typography fontFamily="monospace" color="primary.main" fontWeight={700} variant="body2">
                  {row.airport}
                </Typography>
              </TableCell>
              <TableCell align="right">{row.departures.toLocaleString()}</TableCell>
              <TableCell align="right">{row.arrivals.toLocaleString()}</TableCell>
              <TableCell align="right">
                <Typography fontWeight={700}>{row.total_flights.toLocaleString()}</Typography>
              </TableCell>
              <TableCell>
                <Box sx={{ height: 6, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <Box sx={{
                    height: '100%',
                    width: `${(row.total_flights / max) * 100}%`,
                    background: 'linear-gradient(90deg, #1e88e5, #42a5f5)',
                    borderRadius: 1,
                  }} />
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function AircraftTable({ data }: { data: AircraftPosition[] }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }}>#</TableCell>
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
              <TableCell sx={{ color: 'text.secondary' }}>{i + 1}</TableCell>
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
                  ? <Typography fontWeight={600}>{Math.round(row.altitude_m).toLocaleString()}</Typography>
                  : '—'}
              </TableCell>
              <TableCell align="right">
                {row.speed_kmh != null
                  ? <Typography color="warning.main" fontWeight={700}>{Math.round(row.speed_kmh)}</Typography>
                  : '—'}
              </TableCell>
              <TableCell align="right">
                {row.vertical_rate_ms != null ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                    {row.vertical_rate_ms > 0.5
                      ? <ArrowUpwardIcon sx={{ fontSize: 13, color: 'success.main' }} />
                      : row.vertical_rate_ms < -0.5
                        ? <ArrowDownwardIcon sx={{ fontSize: 13, color: 'error.main' }} />
                        : null}
                    <Typography variant="body2">{row.vertical_rate_ms.toFixed(1)}</Typography>
                  </Box>
                ) : '—'}
              </TableCell>
              <TableCell>
                {row.on_ground
                  ? <Chip label="На земле" size="small" variant="outlined" sx={{ fontSize: 11 }} />
                  : <Chip label="В воздухе" size="small" color="success" variant="outlined" sx={{ fontSize: 11 }} />}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default function RealtimePage() {
  const busyness = useAirportBusyness(24, 20)
  const fastest  = useFastestAircraft(20)
  const highest  = useHighestAircraft(20)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <RadarIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5">Реальное время</Typography>
          <Typography variant="body2" color="text.secondary">
            Текущий трафик по данным OpenSky Network
          </Typography>
        </Box>
      </Box>

      <SectionCard
        title="Загруженность аэропортов (24 ч)"
        loading={busyness.loading}
        error={busyness.error}
        refetch={busyness.refetch}
        count={busyness.data?.length}
      >
        {busyness.data && <BusynessTable data={busyness.data} />}
      </SectionCard>

      <SectionCard
        title="Самые быстрые воздушные суда"
        loading={fastest.loading}
        error={fastest.error}
        refetch={fastest.refetch}
        count={fastest.data?.length}
      >
        {fastest.data && <AircraftTable data={fastest.data} />}
      </SectionCard>

      <SectionCard
        title="Наибольшая высота полёта"
        loading={highest.loading}
        error={highest.error}
        refetch={highest.refetch}
        count={highest.data?.length}
      >
        {highest.data && <AircraftTable data={highest.data} />}
      </SectionCard>
    </Box>
  )
}

