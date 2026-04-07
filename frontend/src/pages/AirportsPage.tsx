import { useState } from 'react'
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, Grid, Card, CardContent, CardHeader,
  LinearProgress,
} from '@mui/material'
import LocationCityIcon from '@mui/icons-material/LocationCity'
import SearchIcon       from '@mui/icons-material/Search'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend, Cell, PieChart, Pie, ComposedChart, Line,
} from 'recharts'
import { SectionCard } from '@/components/DataBlock'
import {
  useAirportStats, useAirportPeakHours,
  useAirportDestinations, useAirportThroughput, useAirportDailyTrend,
} from '@hooks/useAirports'
import type { AirportStats, PeakHours, Destination, Throughput, DailyTrend } from '@api/types'

const DEFAULT_AIRPORT  = 'EDDF'
const COMPARE_AIRPORTS = ['EDDF', 'LFPG', 'EGLL']

const C = {
  blue:   '#1e88e5',
  amber:  '#ffa726',
  green:  '#66bb6a',
  red:    '#ef5350',
  purple: '#ab47bc',
  teal:   '#26c6da',
  axis:   '#78909c',
  grid:   'rgba(255,255,255,0.07)',
  label:  '#90caf9',
}

const DEST_COLORS = [C.blue, C.amber, C.green, C.red, C.purple, C.teal,
  '#ec407a', '#26a69a', '#7e57c2', '#ff7043']

function StatsBarChart({ data }: { data: AirportStats[] }) {
  const sorted = [...data].sort((a, b) => b.total_flights - a.total_flights).slice(0, 15)
  const chartData = sorted.reverse().map(d => ({
    airport: d.airport,
    dep: d.departures,
    arr: d.arrivals,
  }))
  return (
    <ResponsiveContainer width="100%" height={380}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: C.axis, fontSize: 10 }} />
        <YAxis dataKey="airport" type="category"
          tick={{ fill: C.label, fontSize: 11, fontFamily: 'monospace' }} width={46} />
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: C.label, fontWeight: 700 }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#b0bec5' }} />
        <Bar dataKey="dep" name="Вылеты" fill={C.blue} stackId="a" maxBarSize={18} />
        <Bar dataKey="arr" name="Прилёты" fill={C.amber} stackId="a" maxBarSize={18} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

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

function PeakHoursChart({ data }: { data: PeakHours }) {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, '0')}:00`,
    dep: data.departure[i] ?? 0,
    arr: data.arrival[i] ?? 0,
  }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={hours} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.blue} stopOpacity={0.4} />
            <stop offset="95%" stopColor={C.blue} stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="arrGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.amber} stopOpacity={0.4} />
            <stop offset="95%" stopColor={C.amber} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey="hour" tick={{ fill: C.axis, fontSize: 9 }} interval={2} />
        <YAxis tick={{ fill: C.axis, fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: C.label }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#b0bec5' }} />
        <Area type="monotone" dataKey="dep" name="Вылеты" stroke={C.blue} fill="url(#depGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="arr" name="Прилёты" stroke={C.amber} fill="url(#arrGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function DailyTrendChart({ icao }: { icao: string }) {
  const { data, loading } = useAirportDailyTrend(icao, 14)
  if (loading) return <LinearProgress sx={{ my: 2 }} />
  if (!data?.length) return <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>Нет данных</Typography>
  const chartData = data.map((d: DailyTrend) => ({
    date: d.date.slice(5),       // MM-DD
    dep: d.departures,
    arr: d.arrivals,
    total: d.total,
  }))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={chartData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey="date" tick={{ fill: C.axis, fontSize: 9 }} angle={-15} textAnchor="end" height={32} />
        <YAxis tick={{ fill: C.axis, fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: C.label }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#b0bec5' }} />
        <Bar dataKey="dep" name="Вылеты" fill={C.blue} maxBarSize={20} opacity={0.85} />
        <Bar dataKey="arr" name="Прилёты" fill={C.amber} maxBarSize={20} opacity={0.85} />
        <Line type="monotone" dataKey="total" name="Итого" stroke={C.green} strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function DestinationsPieChart({ data }: { data: Destination[] }) {
  const top = [...data].sort((a, b) => b.flight_count - a.flight_count).slice(0, 10)
  const rest = data.slice(10).reduce((acc, d) => acc + d.flight_count, 0)
  const pieData = [
    ...top.map(d => ({ name: d.destination, value: d.flight_count })),
    ...(rest > 0 ? [{ name: 'Другие', value: rest }] : []),
  ]
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
          paddingAngle={2}
          label={({ name, percent }) => percent > 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
          labelLine={false}
        >
          {pieData.map((_, i) => <Cell key={i} fill={DEST_COLORS[i % DEST_COLORS.length]} />)}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => [v, 'Рейсов']}
        />
        <Legend wrapperStyle={{ fontSize: 10, color: '#b0bec5' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

function DestinationsTable({ data }: { data: Destination[] }) {
  const sorted = [...data].sort((a, b) => b.flight_count - a.flight_count)
  const max = sorted[0]?.flight_count ?? 1
  return (
    <TableContainer sx={{ maxHeight: 340 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }}>#</TableCell>
            <TableCell>ICAO</TableCell>
            <TableCell>Аэропорт</TableCell>
            <TableCell>Страна</TableCell>
            <TableCell align="right">Рейсов</TableCell>
            <TableCell sx={{ minWidth: 100 }}>Доля</TableCell>
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
              <TableCell sx={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.airport_name ?? '—'}
              </TableCell>
              <TableCell>{row.country ?? '—'}</TableCell>
              <TableCell align="right">
                <Typography fontWeight={600}>{row.flight_count}</Typography>
              </TableCell>
              <TableCell>
                <LinearProgress variant="determinate" value={(row.flight_count / max) * 100} sx={{ height: 6 }} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function ThroughputChart({ data }: { data: Throughput[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey="airport" tick={{ fill: C.label, fontSize: 11, fontFamily: 'monospace' }} />
        <YAxis yAxisId="total" tick={{ fill: C.axis, fontSize: 10 }} />
        <YAxis yAxisId="rate" orientation="right" tick={{ fill: C.teal, fontSize: 10 }} unit="/ч" />
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: C.label, fontWeight: 700 }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#b0bec5' }} />
        <Bar yAxisId="total" dataKey="departures" name="Вылеты" fill={C.blue} radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Bar yAxisId="total" dataKey="arrivals"   name="Прилёты" fill={C.amber} radius={[3, 3, 0, 0]} maxBarSize={28} />
        <Line yAxisId="rate" type="monotone" dataKey="avg_flights_per_hour" name="Рейсов/ч" stroke={C.teal} strokeWidth={2} dot={{ r: 4 }} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function ThroughputCards({ data }: { data: Throughput[] }) {
  return (
    <Grid container spacing={2} sx={{ mt: 0 }}>
      {data.map((row) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={row.airport}>
          <Card sx={{ border: '1px solid rgba(30,136,229,0.2)' }}>
            <CardContent sx={{ p: '12px 16px!important' }}>
              <Typography fontFamily="monospace" color="primary.main" fontWeight={700} variant="h6">
                {row.airport}
              </Typography>
              <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Вылеты</Typography>
                  <Typography fontWeight={700} color="primary.main">{row.departures}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Прилёты</Typography>
                  <Typography fontWeight={700} color="warning.main">{row.arrivals}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Рейсов/ч</Typography>
                  <Typography fontWeight={700} color="success.main">
                    {row.avg_flights_per_hour.toFixed(1)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default function AirportsPage() {
  const [icao, setIcao]   = useState(DEFAULT_AIRPORT)
  const [search, setSearch] = useState(DEFAULT_AIRPORT)

  const stats        = useAirportStats(7)
  const peakHours    = useAirportPeakHours(icao, 7)
  const destinations = useAirportDestinations(icao, 7)
  const throughput   = useAirportThroughput(COMPARE_AIRPORTS, 7)

  const handleSearch = () => {
    const val = search.trim().toUpperCase()
    if (val.length >= 3) setIcao(val)
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <LocationCityIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5">Аэропорты</Typography>
          <Typography variant="body2" color="text.secondary">
            Статистика, загруженность и направления
          </Typography>
        </Box>
      </Box>

      {/* Top airports chart + table */}
      <SectionCard
        title="Рейтинг аэропортов (7 дней)"
        loading={stats.loading} error={stats.error} refetch={stats.refetch}
        count={stats.data?.length}
      >
        {stats.data && (
          <>
            <StatsBarChart data={stats.data} />
            <Box sx={{ mt: 2 }}>
              <StatsTable data={stats.data} />
            </Box>
          </>
        )}
      </SectionCard>

      {/* Throughput comparison */}
      <SectionCard
        title={`Сравнение пропускной способности: ${COMPARE_AIRPORTS.join(', ')}`}
        loading={throughput.loading} error={throughput.error} refetch={throughput.refetch}
      >
        {throughput.data && (
          <>
            <ThroughputChart data={throughput.data} />
            <Box sx={{ mt: 2 }}>
              <ThroughputCards data={throughput.data} />
            </Box>
          </>
        )}
      </SectionCard>

      {/* Detailed airport analysis */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title={<Typography variant="h6">Детальный анализ аэропорта</Typography>} />
        <CardContent sx={{ pt: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
            <TextField
            label="ICAO-код"
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            size="small"
            sx={{ width: 180 }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            inputProps={{ style: { fontFamily: 'monospace' } }}
          />
          <Button variant="contained" size="small" startIcon={<SearchIcon />} onClick={handleSearch}>
            Открыть
          </Button>
          </Box>

          <Typography variant="h6" fontFamily="monospace" color="primary.main" sx={{ mb: 2 }}>
          {icao}
        </Typography>

        {/* Daily trend */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
          Динамика рейсов по дням (14 дней)
        </Typography>
        <DailyTrendChart icao={icao} />

        {/* Peak hours */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 0.5 }}>
          Пиковые часы вылетов и прилётов (7 дней)
        </Typography>
        {peakHours.loading
          ? <LinearProgress sx={{ my: 2 }} />
          : peakHours.data
            ? <PeakHoursChart data={peakHours.data} />
            : <Typography color="text.secondary" variant="body2">Нет данных</Typography>
        }

        {/* Destinations */}
        {destinations.data && destinations.data.length > 0 && (
          <>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 1 }}>
              Направления из {icao} — Топ-10
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 5 }}>
                <DestinationsPieChart data={destinations.data} />
              </Grid>
              <Grid size={{ xs: 12, md: 7 }}>
                <DestinationsTable data={destinations.data} />
              </Grid>
            </Grid>
          </>
        )}
        </CardContent>
      </Card>
    </Box>
  )
}
