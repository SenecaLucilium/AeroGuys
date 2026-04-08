import { useState } from 'react'
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Grid, LinearProgress,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material'
import RouteIcon         from '@mui/icons-material/AltRoute'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Cell, ScatterChart, Scatter, ZAxis, ReferenceLine,
} from 'recharts'
import { SectionCard } from '@/components/DataBlock'
import { usePopularRoutes, useRouteEfficiency, useDurationDistribution, useTopAirlines } from '@hooks/useRoutes'
import type { PopularRoute, RouteEfficiency, DurationBucket, AirlineStat } from '@api/types'

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

type Period = 1 | 7 | 14 | 30

// ─── Popular routes horizontal bar ───────────────────────────────────────────
function PopularRoutesChart({ data }: { data: PopularRoute[] }) {
  const top = [...data].sort((a, b) => b.flight_count - a.flight_count).slice(0, 15).reverse()
  const chartData = top.map(d => ({
    route: `${d.departure}→${d.arrival}`,
    count: d.flight_count,
    ac: d.unique_aircraft,
  }))
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: C.axis, fontSize: 10 }} />
        <YAxis dataKey="route" type="category"
          tick={{ fill: C.label, fontSize: 10, fontFamily: 'monospace' }} width={90} />
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: C.label, fontWeight: 700 }}
          formatter={(v: number, name: string) => [v, name === 'count' ? 'Рейсов' : 'ВС']}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: '#b0bec5' }} />
        <Bar dataKey="count" name="Рейсов" fill={C.blue} maxBarSize={16} radius={[0, 3, 3, 0]} />
        <Bar dataKey="ac"    name="Уникальных ВС" fill={C.teal} maxBarSize={16} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Popular routes table ─────────────────────────────────────────────────────
function PopularRoutesTable({ data }: { data: PopularRoute[] }) {
  const sorted = [...data].sort((a, b) => b.flight_count - a.flight_count)
  const max = sorted[0]?.flight_count ?? 1
  return (
    <TableContainer sx={{ maxHeight: 360 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }}>#</TableCell>
            <TableCell>Откуда</TableCell>
            <TableCell>Куда</TableCell>
            <TableCell align="right">Рейсов</TableCell>
            <TableCell align="right">ВС</TableCell>
            <TableCell align="right">Ср. время, мин</TableCell>
            <TableCell sx={{ minWidth: 120 }}>Доля</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((row, i) => (
            <TableRow key={`${row.departure}-${row.arrival}`}>
              <TableCell sx={{ color: 'text.secondary' }}>{i + 1}</TableCell>
              <TableCell>
                <Typography fontFamily="monospace" color="primary.main" fontWeight={700} variant="body2">
                  {row.departure}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography fontFamily="monospace" color="warning.main" fontWeight={700} variant="body2">
                  {row.arrival}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight={700}>{row.flight_count}</Typography>
              </TableCell>
              <TableCell align="right">{row.unique_aircraft}</TableCell>
              <TableCell align="right">
                {row.avg_duration_minutes !== null ? Math.round(row.avg_duration_minutes) : '—'}
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

// ─── Efficiency scatter plot ──────────────────────────────────────────────────
const SCATTER_COLORS = [C.blue, C.amber, C.green, C.red, C.teal, C.purple]

interface ScatterPoint {
  x: number
  y: number
  z: number
  route: string
}

function EfficiencyScatter({ data }: { data: RouteEfficiency[] }) {
  const points: ScatterPoint[] = data
    .filter(d => d.route_efficiency_pct !== null && d.great_circle_km > 0)
    .map(d => ({
      x: d.great_circle_km,
      y: d.route_efficiency_pct!,
      z: Math.sqrt(d.flight_count) * 4,
      route: `${d.departure}→${d.arrival}`,
    }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart margin={{ left: 8, right: 24, top: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
        <XAxis
          dataKey="x" type="number" name="Расстояние"
          tick={{ fill: C.axis, fontSize: 10 }} unit=" км"
          label={{ value: 'Расстояние (км)', position: 'insideBottom', offset: -4, fill: C.axis, fontSize: 11 }}
          height={40}
        />
        <YAxis
          dataKey="y" type="number" name="Эффективность"
          tick={{ fill: C.axis, fontSize: 10 }} unit="%"
          label={{ value: 'Эффект-ть %', angle: -90, position: 'insideLeft', fill: C.axis, fontSize: 11 }}
        />
        <ZAxis dataKey="z" range={[30, 300]} />
        <ReferenceLine y={100} stroke={C.green} strokeDasharray="4 4" />
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          formatter={(v: number, name: string) => {
            if (name === 'Расстояние') return [`${v.toFixed(0)} км`, name]
            if (name === 'Эффективность') return [`${v.toFixed(1)}%`, name]
            return [v, name]
          }}
        />
        <Scatter
          data={points}
          fill={C.blue}
          fillOpacity={0.7}
        >
          {points.map((_, i) => (
            <Cell key={i} fill={SCATTER_COLORS[i % SCATTER_COLORS.length]} fillOpacity={0.65} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

// ─── Duration distribution histogram ─────────────────────────────────────────
function DurationChart({ data }: { data: DurationBucket[] }) {
  const chartData = data.map(d => ({ label: d.label, count: d.count }))
  const maxVal = Math.max(...chartData.map(d => d.count))
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ left: 0, right: 16, top: 4, bottom: 32 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: C.axis, fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
        <YAxis tick={{ fill: C.axis, fontSize: 10 }} />
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: C.label }}
          formatter={(v: number) => [v, 'Рейсов']}
        />
        <Bar dataKey="count" name="Рейсов" maxBarSize={30} radius={[3, 3, 0, 0]}>
          {chartData.map((d, i) => (
            <Cell key={i} fill={d.count === maxVal ? C.amber : C.blue} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Airlines chart ───────────────────────────────────────────────────────────
function AirlinesChart({ data }: { data: AirlineStat[] }) {
  const sorted = [...data].sort((a, b) => b.flights - a.flights).reverse()
  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={sorted} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={C.grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: C.axis, fontSize: 10 }} />
        <YAxis dataKey="airline_code" type="category"
          tick={{ fill: C.label, fontSize: 11, fontFamily: 'monospace' }} width={48} />
        <Tooltip
          contentStyle={{ background: '#0d1627', border: `1px solid ${C.blue}44`, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: C.label, fontWeight: 700 }}
          formatter={(v: number) => [v, 'Рейсов']}
        />
        <Bar dataKey="flights" name="Рейсов" fill={C.purple} maxBarSize={16} radius={[0, 3, 3, 0]}>
          {sorted.map((_, i) => (
            <Cell key={i} fill={i % 2 === 0 ? C.purple : '#7e57c2'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RoutesPage() {
  const [period, setPeriod] = useState<Period>(7)

  const popular    = usePopularRoutes(period, 20)
  const efficiency = useRouteEfficiency(period, 50)
  const duration   = useDurationDistribution(period)
  const airlines   = useTopAirlines(period, 15)

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <RouteIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h5">Маршруты</Typography>
            <Typography variant="body2" color="text.secondary">
              Популярность, эффективность и авиакомпании
            </Typography>
          </Box>
        </Box>
        <ToggleButtonGroup
          value={period}
          exclusive
          size="small"
          onChange={(_, v) => v && setPeriod(v as Period)}
        >
          {([1, 7, 14, 30] as Period[]).map(d => (
            <ToggleButton key={d} value={d} sx={{ px: 2, fontSize: 12 }}>
              {d} д
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Popular routes */}
      <SectionCard
        title={`Популярные маршруты (${period} дней)`}
        loading={popular.loading} error={popular.error} refetch={popular.refetch}
        count={popular.data?.length}
      >
        {popular.data && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <PopularRoutesChart data={popular.data} />
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <PopularRoutesTable data={popular.data} />
            </Grid>
          </Grid>
        )}
      </SectionCard>

      {/* Duration distribution + Airlines */}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard
            title="Распределение длительности рейсов"
            loading={duration.loading} error={duration.error} refetch={duration.refetch}
          >
            {duration.data && <DurationChart data={duration.data} />}
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard
            title={`Топ авиакомпаний по рейсам (${period} д)`}
            loading={airlines.loading} error={airlines.error} refetch={airlines.refetch}
          >
            {airlines.data && <AirlinesChart data={airlines.data} />}
          </SectionCard>
        </Grid>
      </Grid>

      {/* Route efficiency scatter */}
      <SectionCard
        title="Эффективность маршрутов"
        loading={efficiency.loading} error={efficiency.error} refetch={efficiency.refetch}
        count={efficiency.data?.length}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Ось X — расстояние по большому кругу (км) · Ось Y — отношение фактического расстояния к минимальному (%) · Размер точки — число рейсов
        </Typography>
        {efficiency.data && <EfficiencyScatter data={efficiency.data} />}
      </SectionCard>
    </Box>
  )
}
