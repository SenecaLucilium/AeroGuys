import { useState } from 'react'
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, Grid, Card, CardContent,
  LinearProgress, Chip,
} from '@mui/material'
import LocationCityIcon from '@mui/icons-material/LocationCity'
import SearchIcon       from '@mui/icons-material/Search'
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'
import FlightLandIcon    from '@mui/icons-material/FlightLand'
import { SectionCard } from '@/components/DataBlock'
import {
  useAirportStats, useAirportPeakHours,
  useAirportDestinations, useAirportThroughput,
} from '@hooks/useAirports'
import type { AirportStats, PeakHours, Destination, Throughput } from '@api/types'

const DEFAULT_AIRPORT  = 'EDDF'
const COMPARE_AIRPORTS = ['EDDF', 'LFPG', 'EGLL']

function StatsTable({ data }: { data: AirportStats[] }) {
  const sorted = [...data].sort((a, b) => b.total_flights - a.total_flights)
  const max = sorted[0]?.total_flights ?? 1
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }}>#</TableCell>
            <TableCell>Аэропорт</TableCell>
            <TableCell align="right">Вылеты</TableCell>
            <TableCell align="right">Прилёты</TableCell>
            <TableCell align="right">Всего</TableCell>
            <TableCell sx={{ minWidth: 140 }}>Доля</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((row, i) => (
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
                <LinearProgress
                  variant="determinate"
                  value={(row.total_flights / max) * 100}
                  sx={{ height: 6 }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function PeakHoursTable({ data }: { data: PeakHours }) {
  const hours  = Array.from({ length: 24 }, (_, i) => i)
  const maxVal = Math.max(
    ...hours.map(h => Math.max(data.departure[h] ?? 0, data.arrival[h] ?? 0)),
    1,
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: 'primary.main' }} />
          <Typography variant="caption" color="text.secondary">Вылеты</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: 'secondary.main' }} />
          <Typography variant="caption" color="text.secondary">Прилёты</Typography>
        </Box>
      </Box>
      <TableContainer sx={{ maxHeight: 380 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 70 }}>Час</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FlightTakeoffIcon sx={{ fontSize: 13 }} />Вылеты
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ width: 50 }}>Кол.</TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <FlightLandIcon sx={{ fontSize: 13 }} />Прилёты
                </Box>
              </TableCell>
              <TableCell align="right" sx={{ width: 50 }}>Кол.</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {hours.map(h => {
              const dep = data.departure[h] ?? 0
              const arr = data.arrival[h] ?? 0
              return (
                <TableRow key={h}>
                  <TableCell>
                    <Typography fontFamily="monospace" variant="body2" color="text.secondary">
                      {String(h).padStart(2, '0')}:00
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <LinearProgress
                      variant="determinate"
                      value={(dep / maxVal) * 100}
                      color="primary"
                      sx={{ height: 7 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" color="primary.main" fontWeight={dep > 0 ? 600 : 400}>
                      {dep || '0'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <LinearProgress
                      variant="determinate"
                      value={(arr / maxVal) * 100}
                      color="warning"
                      sx={{ height: 7 }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="caption" color="secondary.main" fontWeight={arr > 0 ? 600 : 400}>
                      {arr || '0'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

function DestinationsTable({ data }: { data: Destination[] }) {
  const sorted = [...data].sort((a, b) => b.flight_count - a.flight_count)
  const max = sorted[0]?.flight_count ?? 1
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }}>#</TableCell>
            <TableCell>ICAO</TableCell>
            <TableCell>Аэропорт</TableCell>
            <TableCell>Страна</TableCell>
            <TableCell align="right">Рейсов</TableCell>
            <TableCell sx={{ minWidth: 120 }}>Доля</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((row, i) => (
            <TableRow key={row.destination}>
              <TableCell sx={{ color: 'text.secondary' }}>{i + 1}</TableCell>
              <TableCell>
                <Typography fontFamily="monospace" color="primary.main" fontWeight={700} variant="body2">
                  {row.destination}
                </Typography>
              </TableCell>
              <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.airport_name ?? '—'}
              </TableCell>
              <TableCell>{row.country ?? '—'}</TableCell>
              <TableCell align="right">
                <Typography fontWeight={600}>{row.flight_count}</Typography>
              </TableCell>
              <TableCell>
                <LinearProgress
                  variant="determinate"
                  value={(row.flight_count / max) * 100}
                  sx={{ height: 6 }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function ThroughputCards({ data }: { data: Throughput[] }) {
  return (
    <Grid container spacing={2}>
      {data.map(row => (
        <Grid key={row.airport} size={{ xs: 12, sm: 6, md: 4 }}>
          <Card variant="outlined" sx={{ borderColor: 'rgba(30,136,229,0.25)', bgcolor: 'rgba(30,136,229,0.04)' }}>
            <CardContent>
              <Typography
                variant="h4"
                fontFamily="monospace"
                color="primary.main"
                fontWeight={700}
                gutterBottom
              >
                {row.airport}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Всего рейсов
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {row.total_flights.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Ср. в час
                  </Typography>
                  <Typography variant="h5" fontWeight={700} color="secondary.main">
                    {row.avg_flights_per_hour.toFixed(1)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Chip
                  icon={<FlightTakeoffIcon />}
                  label={row.departures.toLocaleString()}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  icon={<FlightLandIcon />}
                  label={row.arrivals.toLocaleString()}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default function AirportsPage() {
  const [icao,  setIcao]  = useState(DEFAULT_AIRPORT)
  const [input, setInput] = useState(DEFAULT_AIRPORT)

  const stats        = useAirportStats(7)
  const peakHours    = useAirportPeakHours(icao, 7)
  const destinations = useAirportDestinations(icao, 7)
  const throughput   = useAirportThroughput(COMPARE_AIRPORTS, 7)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <LocationCityIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5">Аэропорты</Typography>
          <Typography variant="body2" color="text.secondary">
            Статистика, пиковые часы и направления
          </Typography>
        </Box>
      </Box>

      {/* ICAO picker */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField
          label="ICAO-код аэропорта"
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          inputProps={{ maxLength: 4, style: { fontFamily: 'monospace', letterSpacing: 2 } }}
          size="small"
          sx={{ width: 160 }}
        />
        <Button
          variant="contained"
          startIcon={<SearchIcon />}
          onClick={() => setIcao(input)}
          disabled={input.length < 3}
        >
          Применить
        </Button>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" color="text.secondary">Выбран:</Typography>
          <Chip label={icao} color="primary" size="small" variant="filled" />
        </Box>
      </Box>

      <SectionCard
        title="Рейтинг аэропортов (7 дней)"
        loading={stats.loading}
        error={stats.error}
        refetch={stats.refetch}
        count={stats.data?.length}
      >
        {stats.data && <StatsTable data={stats.data} />}
      </SectionCard>

      <SectionCard
        title={`Пиковые часы — ${icao} (7 дней)`}
        loading={peakHours.loading}
        error={peakHours.error}
        refetch={peakHours.refetch}
      >
        {peakHours.data && <PeakHoursTable data={peakHours.data} />}
      </SectionCard>

      <SectionCard
        title={`Направления из ${icao} (7 дней)`}
        loading={destinations.loading}
        error={destinations.error}
        refetch={destinations.refetch}
        count={destinations.data?.length}
      >
        {destinations.data && <DestinationsTable data={destinations.data} />}
      </SectionCard>

      <SectionCard
        title={`Пропускная способность: ${COMPARE_AIRPORTS.join(' · ')}`}
        loading={throughput.loading}
        error={throughput.error}
        refetch={throughput.refetch}
      >
        {throughput.data && <ThroughputCards data={throughput.data} />}
      </SectionCard>
    </Box>
  )
}

