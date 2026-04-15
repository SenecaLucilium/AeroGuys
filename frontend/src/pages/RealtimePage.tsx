import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Grid, Card, CardContent,
} from '@mui/material'
import RadarIcon         from '@mui/icons-material/Radar'
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'
import FlightLandIcon    from '@mui/icons-material/FlightLand'
import ArrowUpwardIcon   from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import PublicIcon        from '@mui/icons-material/Public'
import SpeedIcon         from '@mui/icons-material/Speed'
import HeightIcon        from '@mui/icons-material/Height'
import FlightIcon        from '@mui/icons-material/Flight'
import LocationCityIcon  from '@mui/icons-material/LocationCity'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { SectionCard } from '@/components/DataBlock'
import {
  useFastestAircraft, useHighestAircraft, useCityBusyness,
} from '@hooks/useRealtime'
import {
  useSnapshotStats, useFlightPhases, useSpeedDistribution, useCountryDistribution,
} from '@hooks/useAircraft'
import type { AircraftPosition, CityBusyness } from '@api/types'

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

const PHASE_COLORS: Record<string, string> = {
  climb:   C.green,
  descent: C.red,
  level:   C.blue,
}
const PHASE_LABELS: Record<string, string> = {
  climb: 'Набор', descent: 'Снижение', level: 'Горизонт',
}

const COUNTRY_COLORS = [C.blue, C.amber, C.teal, C.purple, C.green, C.red,
  '#ec407a', '#26a69a', '#7e57c2', '#29b6f6', '#d4e157', '#ff7043', '#78909c', '#8d6e63', '#42a5f5']

// ─── KPI card ────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, sub, color = C.blue,
}: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card sx={{ border: `1px solid ${color}33`, background: `${color}0d`, flex: 1, minWidth: 120 }}>
      <CardContent sx={{ p: '12px 16px!important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Box sx={{ color, display: 'flex', fontSize: 20 }}>{icon}</Box>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
        </Box>
        <Typography variant="h5" fontWeight={700} sx={{ color, lineHeight: 1 }}>{value}</Typography>
        {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
      </CardContent>
    </Card>
  )
}

// ─── City busyness chart ──────────────────────────────────────────────────────
function CityBusynessChart({ data }: { data: CityBusyness[] }) {
  const sorted = [...data].sort((a, b) => b.total_flights - a.total_flights).slice(0, 12)
  const chartData = sorted.map(d => ({
    city: d.city || '—',
    dep: d.departures,
    arr: d.arrivals,
  }))
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: C.axis, fontSize: 10 }} />
        <YAxis dataKey="city" type="category" tick={{ fill: C.label, fontSize: 11 }} width={110} />
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: C.label, fontWeight: 700 }}
          itemStyle={{ color: '#e3f2fd' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#b0bec5' }} />
        <Bar dataKey="dep" name="Вылеты" fill={C.blue} radius={[0, 3, 3, 0]} maxBarSize={14} />
        <Bar dataKey="arr" name="Прилёты" fill={C.amber} radius={[0, 3, 3, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Speed distribution chart ─────────────────────────────────────────────────
function SpeedDistChart() {
  const { data } = useSpeedDistribution()
  if (!data?.length) return null
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: C.axis, fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={36} />
        <YAxis tick={{ fill: C.axis, fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          formatter={(v: number) => [v, 'Самолётов']}
        />
        <Bar dataKey="count" fill={C.teal} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Country distribution chart ───────────────────────────────────────────────
function CountryChart() {
  const { data, loading, error, refetch } = useCountryDistribution(15)
  const sorted = data ? [...data].sort((a, b) => a.aircraft_count - b.aircraft_count).slice(-12) : []
  return (
    <SectionCard
      title="Топ стран по числу ВС в снапшоте"
      loading={loading} error={error} refetch={refetch}
    >
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={sorted} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
          <XAxis type="number" tick={{ fill: C.axis, fontSize: 10 }} />
          <YAxis dataKey="country" type="category" tick={{ fill: C.label, fontSize: 10 }} width={100} />
          <Tooltip
            contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: C.label, fontWeight: 700 }}
            itemStyle={{ color: '#e3f2fd' }}
            formatter={(v: number) => [v, 'Самолётов']}
          />
          <Bar dataKey="aircraft_count" name="Самолётов" radius={[0, 3, 3, 0]} maxBarSize={16}>
            {sorted.map((_, i) => (
              <Cell key={i} fill={COUNTRY_COLORS[i % COUNTRY_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </SectionCard>
  )
}

// ─── Flight phases donut ──────────────────────────────────────────────────────
function PhasesDonut() {
  const { data } = useFlightPhases()
  if (!data?.length) return null
  const pieData = data.map(d => ({
    name: PHASE_LABELS[d.phase] ?? d.phase,
    value: d.count,
    color: PHASE_COLORS[d.phase] ?? C.axis,
  }))
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
        >
          {pieData.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: C.label, fontWeight: 700 }}
          itemStyle={{ color: '#e3f2fd' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#b0bec5' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Aircraft table ───────────────────────────────────────────────────────────
function AircraftTable({ data }: { data: AircraftPosition[] }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 36 }}>#</TableCell>
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RealtimePage() {
  const stats    = useSnapshotStats()
  const cityBusy = useCityBusyness(24, 20)
  const fastest  = useFastestAircraft(20)
  const highest  = useHighestAircraft(20)

  const s = stats.data
  const airbornePercent = s && s.total > 0
    ? Math.round((s.airborne / s.total) * 100)
    : null

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <RadarIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5">Реальное время</Typography>
          <Typography variant="body2" color="text.secondary">
            Текущий трафик по данным OpenSky Network
          </Typography>
        </Box>
      </Box>

      {/* KPI cards */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <StatCard
          icon={<FlightIcon fontSize="inherit" />}
          label="Всего в снапшоте"
          value={s ? s.total.toLocaleString() : '—'}
          color={C.blue}
        />
        <StatCard
          icon={<FlightTakeoffIcon fontSize="inherit" />}
          label="В воздухе"
          value={s ? s.airborne.toLocaleString() : '—'}
          sub={airbornePercent != null ? `${airbornePercent}% от всех` : undefined}
          color={C.green}
        />
        <StatCard
          icon={<FlightLandIcon fontSize="inherit" />}
          label="На земле"
          value={s ? s.on_ground.toLocaleString() : '—'}
          color={C.amber}
        />
        <StatCard
          icon={<SpeedIcon fontSize="inherit" />}
          label="Макс. скорость"
          value={s?.max_speed_kmh != null ? `${Math.round(s.max_speed_kmh)} км/ч` : '—'}
          color={C.teal}
        />
        <StatCard
          icon={<HeightIcon fontSize="inherit" />}
          label="Макс. высота"
          value={s?.max_altitude_m != null ? `${Math.round(s.max_altitude_m / 100) * 100} м` : '—'}
          sub={s?.max_altitude_m ? `FL${Math.round(s.max_altitude_m / 30.48 / 100) * 100}` : undefined}
          color={C.purple}
        />
        <StatCard
          icon={<PublicIcon fontSize="inherit" />}
          label="Стран в воздухе"
          value={s ? s.countries_count.toLocaleString() : '—'}
          color={C.red}
        />
      </Box>

      {/* Phases + Speed side-by-side */}
      <Grid container spacing={2} sx={{ mb: 0 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionCard title="Фазы полёта" loading={stats.loading} error={stats.error} refetch={stats.refetch}>
            <PhasesDonut />
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <SectionCard title="Распределение скоростей (км/ч)" loading={stats.loading} error={stats.error} refetch={stats.refetch}>
            <SpeedDistChart />
          </SectionCard>
        </Grid>
      </Grid>

      {/* Country distribution */}
      <CountryChart />

      {/* City busyness chart + table */}
      <SectionCard
        title="Загруженность аэропортов (24 ч) — по городам"
        loading={cityBusy.loading}
        error={cityBusy.error}
        refetch={cityBusy.refetch}
        count={cityBusy.data?.length}
      >
        {cityBusy.data && (
          <>
            <CityBusynessChart data={cityBusy.data} />
            <Box sx={{ mt: 2 }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ width: 36 }}>#</TableCell>
                      <TableCell>Город</TableCell>
                      <TableCell>Страна</TableCell>
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...cityBusy.data].sort((a, b) => b.total_flights - a.total_flights).map((row, i) => (
                      <TableRow key={row.city}>
                        <TableCell sx={{ color: 'text.secondary' }}>{i + 1}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <LocationCityIcon sx={{ fontSize: 14, color: C.teal }} />
                            <Typography fontWeight={700} variant="body2">{row.city}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ color: 'text.secondary', fontSize: 12 }}>{row.country || '—'}</TableCell>
                        <TableCell align="right">{row.departures.toLocaleString()}</TableCell>
                        <TableCell align="right">{row.arrivals.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={700}>{row.total_flights.toLocaleString()}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </>
        )}
      </SectionCard>

      {/* Fastest */}
      <SectionCard
        title="Самые быстрые воздушные суда"
        loading={fastest.loading}
        error={fastest.error}
        refetch={fastest.refetch}
        count={fastest.data?.length}
      >
        {fastest.data && <AircraftTable data={fastest.data} />}
      </SectionCard>

      {/* Highest */}
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
