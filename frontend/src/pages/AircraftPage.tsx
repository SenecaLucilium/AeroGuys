import { useState } from 'react'
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Button, Chip, Grid, Card, CardHeader, CardContent,
  LinearProgress, TableSortLabel, TablePagination,
} from '@mui/material'
import FlightIcon        from '@mui/icons-material/Flight'
import SearchIcon        from '@mui/icons-material/Search'
import ArrowUpwardIcon   from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ComposedChart, Line,
} from 'recharts'
import { SectionCard } from '@/components/DataBlock'
import {
  usePositions, useAircraftTypes, useAltitudeProfile,
  useUnidentifiedAircraft, useBusinessAviation,
  useExtremeVerticalRates, useAircraftUsage, useAircraftRoutes,
  useSpeedDistribution, useAltitudeDistribution, useAircraftHistory,
} from '@hooks/useAircraft'
import type {
  AircraftPosition, AircraftType, AltitudeProfile,
  ExtremeVerticalRate, DailyUsage, AircraftRoute, FlightHistory,
} from '@api/types'

const DEFAULT_ICAO24 = '3c6444'

// ─── Chart palette ───────────────────────────────────────────────────────────
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

const PIE_COLORS = [C.blue, C.amber, C.green, C.red, C.purple, C.teal,
  '#ec407a', '#26a69a', '#7e57c2', '#29b6f6', '#ff7043', '#d4e157']

// ─── Aircraft types pie ───────────────────────────────────────────────────────
function TypesPieChart({ data }: { data: AircraftType[] }) {
  const sorted = [...data].filter(d => d.unique_aircraft > 0)
    .sort((a, b) => b.unique_aircraft - a.unique_aircraft)
  const pieData = sorted.map(d => ({ name: d.category_name, value: d.unique_aircraft }))
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
          label={({ name, percent }) =>
            percent > 0.04 ? `${name.split(' ')[0]} ${(percent * 100).toFixed(0)}%` : ''
          }
          labelLine={false}
        >
          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => [v.toLocaleString(), 'Уникальных ВС']}
          itemStyle={{ color: '#e3f2fd' }}
        />
        <Legend wrapperStyle={{ fontSize: 10, color: '#b0bec5' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Altitude profile bar chart ──────────────────────────────────────────────
function AltitudeProfileChart({ data }: { data: AltitudeProfile[] }) {
  const filtered = data
    .filter(d => d.avg_altitude_m != null && d.sample_aircraft > 0)
    .sort((a, b) => (b.avg_altitude_m ?? 0) - (a.avg_altitude_m ?? 0))
  const chartData = filtered.map(d => ({
    name: d.category_name.split(' ')[0],
    avg_alt: d.avg_altitude_m ? Math.round(d.avg_altitude_m) : 0,
    median_alt: d.median_altitude_m ? Math.round(d.median_altitude_m) : 0,
    speed: d.avg_speed_kmh ? Math.round(d.avg_speed_kmh) : 0,
  }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ left: 8, right: 16, top: 4, bottom: 36 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: C.axis, fontSize: 10 }} angle={-25} textAnchor="end" height={48} />
        <YAxis yAxisId="alt" tick={{ fill: C.axis, fontSize: 10 }} unit="м" />
        <YAxis yAxisId="spd" orientation="right" tick={{ fill: C.amber, fontSize: 10 }} unit="км/ч" />
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: C.label, fontWeight: 700 }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#b0bec5' }} />
        <Bar yAxisId="alt" dataKey="avg_alt" name="Ср. высота, м" fill={C.blue} radius={[3, 3, 0, 0]} maxBarSize={30} opacity={0.85} />
        <Bar yAxisId="alt" dataKey="median_alt" name="Медиана, м" fill={C.purple} radius={[3, 3, 0, 0]} maxBarSize={30} opacity={0.7} />
        <Line yAxisId="spd" type="monotone" dataKey="speed" name="Ср. скорость, км/ч" stroke={C.amber} strokeWidth={2} dot={{ r: 3, fill: C.amber }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ─── Speed distribution chart ─────────────────────────────────────────────────
function SpeedDistChart() {
  const { data, loading, error, refetch } = useSpeedDistribution()
  return (
    <SectionCard title="Распределение скоростей (снапшот)" loading={loading} error={error} refetch={refetch}>
      {data && !data.length && <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Нет данных</Typography>}
      {data && data.length > 0 && (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.axis, fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={36} />
            <YAxis tick={{ fill: C.axis, fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [v, 'Самолётов']}
              labelFormatter={(l) => `Скорость: ${l}`}
            />
            <Bar dataKey="count" fill={C.teal} radius={[3, 3, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={`hsl(${190 + i * 12}, 70%, ${45 + i * 3}%)`} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  )
}

// ─── Altitude distribution chart ─────────────────────────────────────────────
function AltDistChart() {
  const { data, loading, error, refetch } = useAltitudeDistribution()
  return (
    <SectionCard title="Распределение высот (снапшот)" loading={loading} error={error} refetch={refetch}>
      {data && !data.length && <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>Нет данных</Typography>}
      {data && data.length > 0 && (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fill: C.axis, fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={36} />
            <YAxis tick={{ fill: C.axis, fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [v, 'Самолётов']}
              labelFormatter={(l) => `Высота: ${l}`}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.map((_, i) => <Cell key={i} fill={`hsl(${220 + i * 8}, 65%, ${35 + i * 4}%)`} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </SectionCard>
  )
}

// ─── Radar chart for aircraft categories ──────────────────────────────────────
function CategoryRadar({ data }: { data: AircraftType[] }) {
  const top = [...data]
    .filter(d => d.unique_aircraft > 0)
    .sort((a, b) => b.unique_aircraft - a.unique_aircraft)
    .slice(0, 8)
  const max = Math.max(...top.map(d => d.unique_aircraft), 1)
  const radarData = top.map(d => ({
    category: d.category_name.split(' ')[0].slice(0, 8),
    value: Math.round((d.unique_aircraft / max) * 100),
    abs: d.unique_aircraft,
  }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={90}>
        <PolarGrid stroke="rgba(144,202,249,0.25)" />
        <PolarAngleAxis dataKey="category" tick={{ fill: C.label, fontSize: 10 }} />
        <Radar name="ВС" dataKey="value" stroke={C.blue} fill={C.blue} fillOpacity={0.55} strokeWidth={2} />
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          formatter={(v: number, _n: string, props: { payload?: { abs?: number } }) => [
            props.payload?.abs?.toLocaleString() ?? v, 'Уникальных ВС'
          ]}
          itemStyle={{ color: '#e3f2fd' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

// ─── Daily usage chart ────────────────────────────────────────────────────────
function UsageChart({ data }: { data: DailyUsage[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey="date" tick={{ fill: C.axis, fontSize: 9 }} angle={-20} textAnchor="end" height={36} />
        <YAxis yAxisId="fl" tick={{ fill: C.axis, fontSize: 10 }} />
        <YAxis yAxisId="h" orientation="right" tick={{ fill: C.amber, fontSize: 10 }} unit="ч" />
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: C.label }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#b0bec5' }} />
        <Bar yAxisId="fl" dataKey="flights" name="Рейсов" fill={C.blue} radius={[3, 3, 0, 0]} maxBarSize={20} opacity={0.85} />
        <Line yAxisId="h" type="monotone" dataKey="total_hours" name="Налёт, ч" stroke={C.amber} strokeWidth={2} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

type PosSortCol = 'icao24' | 'altitude_m' | 'speed_kmh' | 'vertical_rate_ms'

function PaginatedPositionsTable({ data }: { data: AircraftPosition[] }) {
  const [sortCol, setSortCol] = useState<PosSortCol>('altitude_m')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage]       = useState(0)
  const PAGE_SIZE = 20

  const handleSort = (col: PosSortCol) => {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
    setPage(0)
  }

  const sorted = [...data].sort((a, b) => {
    let cmp: number
    if (sortCol === 'icao24') {
      cmp = (a.icao24 ?? '').localeCompare(b.icao24 ?? '')
    } else {
      const an = (a[sortCol] as number | null) ?? (sortDir === 'desc' ? -Infinity : Infinity)
      const bn = (b[sortCol] as number | null) ?? (sortDir === 'desc' ? -Infinity : Infinity)
      cmp = an - bn
    }
    return sortDir === 'asc' ? cmp : -cmp
  })
  const pageData = sorted.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  const col = (id: PosSortCol, label: string, align: 'left' | 'right' = 'right') => (
    <TableCell align={align}>
      <TableSortLabel active={sortCol === id} direction={sortCol === id ? sortDir : 'desc'} onClick={() => handleSort(id)}>
        {label}
      </TableSortLabel>
    </TableCell>
  )

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {col('icao24', 'ICAO24', 'left')}
              <TableCell>Позывной</TableCell>
              <TableCell>Страна</TableCell>
              {col('altitude_m', 'Высота, м')}
              {col('speed_kmh', 'Скорость, км/ч')}
              {col('vertical_rate_ms', 'В/скор., м/с')}
              <TableCell>Статус</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageData.map((row, i) => (
              <TableRow key={`${row.icao24}-${i}`}>
                <TableCell>
                  <Typography fontFamily="monospace" fontSize={12} color="secondary.main">{row.icao24}</Typography>
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
                  {row.altitude_m != null ? Math.round(row.altitude_m).toLocaleString() : '—'}
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

// ─── All snapshot aircraft table ──────────────────────────────────────────────
function AllSnapshotTable() {
  const { data, loading, error } = usePositions({ limit: 300 })
  if (loading) return <LinearProgress sx={{ my: 2 }} />
  if (error) return <Typography color="error" variant="body2" sx={{ p: 1 }}>{error}</Typography>
  if (!data?.length) return <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>Нет данных</Typography>
  return <PaginatedPositionsTable data={data} />
}

// ─── Flight history table ─────────────────────────────────────────────────────
function FlightHistoryTable({ data }: { data: FlightHistory[] }) {
  return (
    <TableContainer sx={{ maxHeight: 400 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }}>#</TableCell>
            <TableCell>Позывной</TableCell>
            <TableCell>Вылет</TableCell>
            <TableCell>Прилёт</TableCell>
            <TableCell>Дата/время вылета</TableCell>
            <TableCell align="right">Длит., мин</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i}>
              <TableCell sx={{ color: 'text.secondary' }}>{i + 1}</TableCell>
              <TableCell>
                <Typography fontFamily="monospace" variant="body2">{row.callsign?.trim() ?? '—'}</Typography>
              </TableCell>
              <TableCell>
                <Typography fontFamily="monospace" color="primary.main" fontWeight={700} variant="body2">
                  {row.departure ?? '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography fontFamily="monospace" color="warning.main" fontWeight={700} variant="body2">
                  {row.arrival ?? '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2" fontSize={11}>
                  {row.first_seen ? new Date(row.first_seen).toLocaleString('ru-RU') : '—'}
                </Typography>
              </TableCell>
              <TableCell align="right">
                {row.duration_minutes != null ? Math.round(row.duration_minutes) : '—'}
              </TableCell>
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
                <Typography fontFamily="monospace" fontSize={12} color="secondary.main">{row.icao24}</Typography>
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
                <Chip
                  label={row.direction === 'climb' ? '↑ Набор' : '↓ Снижение'}
                  size="small"
                  color={row.direction === 'climb' ? 'success' : 'error'}
                  variant="outlined"
                  sx={{ fontSize: 11 }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

function AircraftRoutesTable({ data }: { data: AircraftRoute[] }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Откуда</TableCell>
            <TableCell>Куда</TableCell>
            <TableCell align="right">Раз выполнен</TableCell>
            <TableCell align="right">Ср. длит., мин</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map((row, i) => (
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AircraftPage() {
  const [icao24, setIcao24] = useState(DEFAULT_ICAO24)
  const [search, setSearch] = useState(DEFAULT_ICAO24)

  const types    = useAircraftTypes({ days: 7 })
  const profile  = useAltitudeProfile()
  const extreme  = useExtremeVerticalRates(10, 30)
  const unident  = useUnidentifiedAircraft(50)
  const business = useBusinessAviation(50)
  const usage    = useAircraftUsage(icao24, 30)
  const routes   = useAircraftRoutes(icao24, 30, 10)
  const history  = useAircraftHistory(icao24, 100)

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <FlightIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5">Воздушные суда</Typography>
          <Typography variant="body2" color="text.secondary">
            Аналитика ВС: типы, высоты, скорости, маршруты
          </Typography>
        </Box>
      </Box>

      {/* Aircraft types — Pie + Radar side by side */}
      <Grid container spacing={2} sx={{ mb: 0 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard
            title="Распределение по типам ВС (7 дн.)"
            loading={types.loading} error={types.error} refetch={types.refetch}
          >
            {types.data && <TypesPieChart data={types.data} />}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard
            title="Веб-диаграмма популярности категорий"
            loading={types.loading} error={types.error} refetch={types.refetch}
          >
            {types.data && <CategoryRadar data={types.data} />}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Altitude profile chart */}
      <SectionCard
        title="Высотно-скоростной профиль по категориям"
        loading={profile.loading} error={profile.error} refetch={profile.refetch}
      >
        {profile.data && <AltitudeProfileChart data={profile.data} />}
      </SectionCard>

      {/* Speed + Altitude distributions side by side */}
      <Grid container spacing={2} sx={{ mb: 0 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SpeedDistChart />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AltDistChart />
        </Grid>
      </Grid>

      {/* Extreme vertical rates */}
      <SectionCard
        title="Резкие наборы и снижения высоты"
        loading={extreme.loading} error={extreme.error} refetch={extreme.refetch}
        count={extreme.data?.length}
      >
        {extreme.data && <ExtremeRatesTable data={extreme.data} />}
      </SectionCard>

      {/* Unidentified & Business */}
      <Grid container spacing={2} sx={{ mb: 0 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard
            title="Военные / неопознанные ВС"
            loading={unident.loading} error={unident.error} refetch={unident.refetch}
            count={unident.data?.length}
          >
            {unident.data && <PaginatedPositionsTable data={unident.data} />}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard
            title="Бизнес-авиация"
            loading={business.loading} error={business.error} refetch={business.refetch}
            count={business.data?.length}
          >
            {business.data && <PaginatedPositionsTable data={business.data} />}
          </SectionCard>
        </Grid>
      </Grid>

      {/* All snapshot aircraft */}
      <SectionCard title="Все ВС в снапшоте (последний)" loading={false} error={null} refetch={() => {}}>
        <AllSnapshotTable />
      </SectionCard>

      {/* Individual aircraft section */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title={<Typography variant="h6">Анализ конкретного борта</Typography>} />
        <CardContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            label="ICAO24"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ width: 180 }}
            inputProps={{ style: { fontFamily: 'monospace' } }}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<SearchIcon />}
            onClick={() => setIcao24(search.toLowerCase().trim())}
          >
            Найти
          </Button>
        </Box>

        <Typography variant="subtitle2" color="primary.main" fontFamily="monospace" sx={{ mb: 1 }}>
          {icao24}
        </Typography>

        {/* Usage chart */}
        {usage.data && usage.data.length > 0 ? (
          <>
            <Typography variant="caption" color="text.secondary">
              Налёт по дням (последние 30 дней)
            </Typography>
            <UsageChart data={usage.data} />
          </>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Данные о налёте не найдены
          </Typography>
        )}

        {/* Routes table */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, mb: 0.5 }}>
          Типичные маршруты
        </Typography>
        {routes.data && routes.data.length > 0
          ? <AircraftRoutesTable data={routes.data} />
          : <Typography variant="body2" color="text.secondary">Маршруты не найдены</Typography>
        }

        {/* Flight history */}
        <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 3, mb: 0.5 }}>
          История рейсов (последние 100)
        </Typography>
        {history.loading && <LinearProgress sx={{ my: 1 }} />}
        {!history.loading && history.data && history.data.length > 0
          ? <FlightHistoryTable data={history.data} />
          : !history.loading && <Typography variant="body2" color="text.secondary">Данные о рейсах не найдены</Typography>
        }
        </CardContent>
      </Card>
    </Box>
  )
}
