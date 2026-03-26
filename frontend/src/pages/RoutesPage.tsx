import { useState } from 'react'
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, LinearProgress, Card, CardContent,
  TextField, Button, Alert, Chip,
} from '@mui/material'
import AltRouteIcon  from '@mui/icons-material/AltRoute'
import DownloadIcon  from '@mui/icons-material/Download'
import CheckIcon     from '@mui/icons-material/Check'
import { SectionCard } from '@/components/DataBlock'
import { usePopularRoutes, useRouteEfficiency } from '@hooks/useRoutes'
import { downloadFlightsCsv } from '@api/export'
import type { PopularRoute, RouteEfficiency } from '@api/types'

function PopularRoutesTable({ data }: { data: PopularRoute[] }) {
  const sorted = [...data].sort((a, b) => b.flight_count - a.flight_count)
  const max    = sorted[0]?.flight_count ?? 1
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }}>#</TableCell>
            <TableCell>Откуда</TableCell>
            <TableCell>Куда</TableCell>
            <TableCell align="right">Рейсов</TableCell>
            <TableCell align="right">Ср. время, мин</TableCell>
            <TableCell align="right">Уникальных ВС</TableCell>
            <TableCell sx={{ minWidth: 130 }}>Интенсивность</TableCell>
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
                <Typography fontFamily="monospace" color="primary.main" fontWeight={700} variant="body2">
                  {row.arrival}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography fontWeight={700}>{row.flight_count.toLocaleString()}</Typography>
              </TableCell>
              <TableCell align="right">
                {row.avg_duration_minutes != null ? Math.round(row.avg_duration_minutes) : '—'}
              </TableCell>
              <TableCell align="right">{row.unique_aircraft}</TableCell>
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

function EfficiencyTable({ data }: { data: RouteEfficiency[] }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Откуда</TableCell>
            <TableCell>Куда</TableCell>
            <TableCell align="right">Рейсов</TableCell>
            <TableCell align="right">Ортодромия, км</TableCell>
            <TableCell align="right">Расч. дист., км</TableCell>
            <TableCell sx={{ minWidth: 150 }}>Эффективность</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {data.map(row => {
            const eff = row.route_efficiency_pct
            const color: 'success' | 'warning' | 'error' | 'primary' =
              eff == null ? 'primary' : eff >= 90 ? 'success' : eff >= 75 ? 'warning' : 'error'
            const textColor =
              eff == null ? 'text.secondary'
              : eff >= 90  ? 'success.main'
              : eff >= 75  ? 'warning.main'
              : 'error.main'
            return (
              <TableRow key={`${row.departure}-${row.arrival}`}>
                <TableCell>
                  <Typography fontFamily="monospace" color="primary.main" fontWeight={700} variant="body2">
                    {row.departure}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography fontFamily="monospace" color="primary.main" fontWeight={700} variant="body2">
                    {row.arrival}
                  </Typography>
                </TableCell>
                <TableCell align="right">{row.flight_count}</TableCell>
                <TableCell align="right">{Math.round(row.great_circle_km).toLocaleString()}</TableCell>
                <TableCell align="right">
                  {row.estimated_actual_km != null
                    ? Math.round(row.estimated_actual_km).toLocaleString()
                    : '—'}
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(eff ?? 0, 100)}
                      color={color}
                      sx={{ height: 7, flexGrow: 1 }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color={textColor}
                      sx={{ minWidth: 38, textAlign: 'right' }}
                    >
                      {eff != null ? `${eff.toFixed(0)}%` : '—'}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default function RoutesPage() {
  const popular    = usePopularRoutes(7, 20)
  const efficiency = useRouteEfficiency(7, 20)

  const [csvStart,  setCsvStart]  = useState('2026-03-01T00:00:00')
  const [csvEnd,    setCsvEnd]    = useState('2026-03-21T23:59:59')
  const [csvStatus, setCsvStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [csvError,  setCsvError]  = useState<string | null>(null)

  const handleExport = async () => {
    setCsvStatus('loading')
    setCsvError(null)
    try {
      await downloadFlightsCsv(csvStart, csvEnd)
      setCsvStatus('done')
    } catch (e) {
      setCsvStatus('error')
      setCsvError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <AltRouteIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5">Маршруты</Typography>
          <Typography variant="body2" color="text.secondary">
            Популярные направления и эффективность маршрутов
          </Typography>
        </Box>
      </Box>

      <SectionCard
        title="Популярные маршруты (7 дней)"
        loading={popular.loading} error={popular.error} refetch={popular.refetch}
        count={popular.data?.length}
      >
        {popular.data && <PopularRoutesTable data={popular.data} />}
      </SectionCard>

      <SectionCard
        title="Эффективность маршрутов vs ортодромия (7 дней)"
        loading={efficiency.loading} error={efficiency.error} refetch={efficiency.refetch}
        count={efficiency.data?.length}
      >
        {efficiency.data && <EfficiencyTable data={efficiency.data} />}
      </SectionCard>

      {/* CSV Export */}
      <Card sx={{ border: '1px solid rgba(30,136,229,0.2)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
            <DownloadIcon color="primary" />
            <Typography variant="h6">Экспорт рейсов в CSV</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <TextField
              label="Начало"
              value={csvStart}
              onChange={(e) => setCsvStart(e.target.value)}
              size="small"
              sx={{ width: 220 }}
              placeholder="2026-03-01T00:00:00"
            />
            <TextField
              label="Конец"
              value={csvEnd}
              onChange={(e) => setCsvEnd(e.target.value)}
              size="small"
              sx={{ width: 220 }}
              placeholder="2026-03-21T23:59:59"
            />
            <Button
              variant="contained"
              startIcon={csvStatus === 'done' ? <CheckIcon /> : <DownloadIcon />}
              onClick={handleExport}
              disabled={csvStatus === 'loading'}
              color={csvStatus === 'done' ? 'success' : 'primary'}
            >
              {csvStatus === 'loading' ? 'Скачивание…' : csvStatus === 'done' ? 'Готово' : 'Скачать CSV'}
            </Button>
            {csvStatus === 'done' && (
              <Chip label="Файл сохранён ✓" color="success" size="small" variant="outlined" />
            )}
            {csvStatus === 'error' && (
              <Alert severity="error" sx={{ py: 0.5 }}>{csvError}</Alert>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}

