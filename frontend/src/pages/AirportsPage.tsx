import { useState, useEffect } from 'react'
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, Grid, Card, CardContent, CardHeader,
  LinearProgress, TableSortLabel, TablePagination, Skeleton,
} from '@mui/material'
import LocationCityIcon from '@mui/icons-material/LocationCity'
import SearchIcon       from '@mui/icons-material/Search'
import PlaceIcon        from '@mui/icons-material/Place'
import LanguageIcon     from '@mui/icons-material/Language'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend, Cell, PieChart, Pie, ComposedChart, Line,
} from 'recharts'
import { SectionCard } from '@/components/DataBlock'
import {
  useAirportStats, useAirportPeakHours,
  useAirportDestinations, useAirportDailyTrend, useAirportInfo,
} from '@hooks/useAirports'
import type { AirportStats, PeakHours, Destination, DailyTrend } from '@api/types'

const DEFAULT_AIRPORT = 'EDDF'

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

type SortCol = 'airport' | 'departures' | 'arrivals' | 'total_flights'

function StatsTable({ data }: { data: AirportStats[] }) {
  const [sortCol, setSortCol]  = useState<SortCol>('total_flights')
  const [sortDir, setSortDir]  = useState<'asc' | 'desc'>('desc')
  const [page, setPage]        = useState(0)
  const PAGE_SIZE = 20

  const handleSort = (col: SortCol) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
    setPage(0)
  }

  const sorted = [...data].sort((a, b) => {
    const av = a[sortCol]; const bv = b[sortCol]
    const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
    return sortDir === 'asc' ? cmp : -cmp
  })
  const max = [...data].reduce((m, d) => Math.max(m, d.total_flights), 1)
  const page_data = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const col = (id: SortCol, label: string, align: 'left' | 'right' = 'right') => (
    <TableCell align={align} sx={{ cursor: 'pointer' }}>
      <TableSortLabel
        active={sortCol === id}
        direction={sortCol === id ? sortDir : 'desc'}
        onClick={() => handleSort(id)}
      >{label}</TableSortLabel>
    </TableCell>
  )

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40 }}>#</TableCell>
              {col('airport', 'Аэропорт', 'left')}
              {col('departures', 'Вылеты')}
              {col('arrivals', 'Прилёты')}
              {col('total_flights', 'Всего')}
              <TableCell sx={{ minWidth: 140 }}>Доля</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {page_data.map((row, i) => (
              <TableRow key={row.airport}>
                <TableCell sx={{ color: 'text.secondary' }}>{page * PAGE_SIZE + i + 1}</TableCell>
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
      <TablePagination
        component="div"
        count={sorted.length}
        page={page}
        onPageChange={(_, p) => setPage(p)}
        rowsPerPage={PAGE_SIZE}
        rowsPerPageOptions={[PAGE_SIZE]}
        labelDisplayedRows={({ from, to, count }) => `${from}–${to} из ${count}`}
      />
    </>
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
          itemStyle={{ color: '#e3f2fd' }}
          labelStyle={{ color: '#90caf9', fontWeight: 700 }}
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

function AirportPhoto({ name }: { name: string | null }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!name) return
    setLoading(true)
    setImgUrl(null)
    const encoded = encodeURIComponent(name)
    fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encoded}&prop=pageimages&pithumbsize=600&format=json&origin=*`
    )
      .then(r => r.json())
      .then((json) => {
        const pages = json?.query?.pages ?? {}
        const page = Object.values(pages)[0] as { thumbnail?: { source: string } }
        setImgUrl(page?.thumbnail?.source ?? null)
      })
      .catch(() => setImgUrl(null))
      .finally(() => setLoading(false))
  }, [name])

  if (!name) return null
  if (loading) return <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mt: 2 }} />
  if (!imgUrl) return null
  return (
    <Box sx={{ mt: 2 }}>
      <img
        src={imgUrl}
        alt={name}
        style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 8 }}
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
        Фото: Wikipedia / {name}
      </Typography>
    </Box>
  )
}

export default function AirportsPage() {
  const [icao, setIcao]     = useState(DEFAULT_AIRPORT)
  const [search, setSearch] = useState(DEFAULT_AIRPORT)

  const stats        = useAirportStats(0)          // days=0 → all-time
  const peakHours    = useAirportPeakHours(icao, 7)
  const destinations = useAirportDestinations(icao, 7)
  const airportInfo  = useAirportInfo(icao)

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

      {/* Top airports chart + table (all-time) */}
      <SectionCard
        title="Рейтинг аэропортов (весь период)"
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

      {/* Detailed airport analysis */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title={<Typography variant="h6">Детальный анализ аэропорта</Typography>} />
        <CardContent sx={{ pt: 1 }}>
          {/* Search bar */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
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

          {/* Geo info block */}
          {airportInfo.loading && <LinearProgress sx={{ mb: 1 }} />}
          {airportInfo.data && (
            <Box sx={{ mb: 2, p: 1.5, borderRadius: 2, border: '1px solid rgba(30,136,229,0.2)', background: 'rgba(30,136,229,0.05)' }}>
              <Typography variant="subtitle1" fontWeight={700} color="primary.main" sx={{ mb: 0.5 }}>
                {airportInfo.data.name ?? icao}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {airportInfo.data.city && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LocationCityIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                    <Typography variant="body2">{airportInfo.data.city}</Typography>
                  </Box>
                )}
                {airportInfo.data.country && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <LanguageIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                    <Typography variant="body2">{airportInfo.data.country}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PlaceIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                  <Typography variant="body2" fontFamily="monospace" fontSize={12}>
                    {airportInfo.data.latitude.toFixed(4)}, {airportInfo.data.longitude.toFixed(4)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

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

          {/* Wikipedia airport photo */}
          <AirportPhoto name={airportInfo.data?.name ?? null} />

        </CardContent>
      </Card>
    </Box>
  )
}
