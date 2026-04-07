import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '../styles/map.css'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'
import LinearProgress from '@mui/material/LinearProgress'
import { getPositions } from '@api/aircraft'
import { useSnapshotStats } from '@hooks/useAircraft'
import type { AircraftPosition } from '@api/types'

const REFRESH_SECS = 30
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

function markerColor(ac: AircraftPosition): string {
  if (!ac.on_ground) {
    return (ac.speed_kmh ?? 0) > 700 ? '#ff8f00' : '#42a5f5'
  }
  return '#546e7a'
}

function popupHtml(ac: AircraftPosition): string {
  const speed = ac.speed_kmh != null ? `${Math.round(ac.speed_kmh)} km/h` : '—'
  const alt   = ac.altitude_m != null ? `${Math.round(ac.altitude_m)} m` : '—'
  return `
    <div style="font-family:Inter,sans-serif;color:#e3f2fd;min-width:150px">
      <div style="font-weight:700;font-size:14px;margin-bottom:6px">✈ ${ac.callsign?.trim() || 'UNKNOWN'}</div>
      <div style="font-size:12px;line-height:1.8">
        <span style="color:#90caf9">Origin:</span> ${ac.origin_country ?? '—'}<br/>
        <span style="color:#90caf9">Speed:</span> ${speed}<br/>
        <span style="color:#90caf9">Altitude:</span> ${alt}<br/>
        <span style="color:#90caf9">Status:</span> ${ac.on_ground ? 'On ground' : 'Airborne'}
      </div>
    </div>`
}

type FilterMode = 'all' | 'airborne' | 'ground'

export default function MapPage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<L.Map | null>(null)
  const groupRef     = useRef<L.LayerGroup | null>(null)

  const [data, setData]       = useState<AircraftPosition[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [countdown, setCountdown] = useState(REFRESH_SECS)
  const [filter, setFilter]   = useState<FilterMode>('all')

  const stats = useSnapshotStats()

  const filteredData = filter === 'airborne'
    ? data.filter(a => !a.on_ground)
    : filter === 'ground'
      ? data.filter(a => a.on_ground)
      : data

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getPositions({ limit: 3000 })
      setData(result)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки')
    } finally {
      setLoading(false)
      setCountdown(REFRESH_SECS)
    }
  }, [])

  // Init Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: [30, 15],
      zoom: 3,
      preferCanvas: true,
    })
    L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 18 }).addTo(map)
    groupRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    fetchData()
    return () => {
      map.remove()
      mapRef.current = null
      groupRef.current = null
    }
  }, [fetchData])

  // Update markers when data or filter changes
  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.clearLayers()
    filteredData.forEach((ac) => {
      if (ac.latitude == null || ac.longitude == null) return
      L.circleMarker([ac.latitude, ac.longitude], {
        radius: ac.on_ground ? 5 : 7,
        color: markerColor(ac),
        fillColor: markerColor(ac),
        fillOpacity: 0.85,
        weight: 1,
      })
        .bindPopup(popupHtml(ac), { className: 'dark-popup' })
        .addTo(group)
    })
  }, [filteredData])

  // Auto-refresh countdown
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { fetchData(); return REFRESH_SECS }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [fetchData])

  return (
    // position:fixed заполняет область экрана за drawer (240px) и toolbar (48px)
    // независимо от того, является ли родитель flex-контейнером
    <Box sx={{ position: 'fixed', top: 48, left: 240, right: 0, bottom: 0 }}>
      {/* Map container */}
      <div
        ref={containerRef}
        style={{ position: 'absolute', inset: 0 }}
      />

      {/* Top status bar */}
      <Box sx={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip
          label={loading ? 'Загрузка...' : `${filteredData.length} / ${data.length} ВС`}
          size="small"
          color="primary"
          icon={loading ? <CircularProgress size={12} color="inherit" /> : undefined}
          sx={{ backdropFilter: 'blur(8px)' }}
        />
        {!loading && (
          <Chip
            label={`Обновление через ${countdown}с`}
            size="small"
            variant="outlined"
            sx={{ color: '#90caf9', borderColor: '#1e88e5', backdropFilter: 'blur(8px)' }}
          />
        )}
        {/* Filter chips */}
        {(['all', 'airborne', 'ground'] as FilterMode[]).map((f) => (
          <Chip
            key={f}
            label={f === 'all' ? 'Все' : f === 'airborne' ? '✈ В воздухе' : '⏚ На земле'}
            size="small"
            variant={filter === f ? 'filled' : 'outlined'}
            color={filter === f ? (f === 'airborne' ? 'primary' : f === 'ground' ? 'default' : 'secondary') : 'default'}
            onClick={() => setFilter(f)}
            sx={{ cursor: 'pointer', backdropFilter: 'blur(8px)' }}
          />
        ))}
      </Box>

      {/* Error */}
      {error && (
        <Box sx={{ position: 'absolute', top: 56, left: 16, zIndex: 1000, maxWidth: 360 }}>
          <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>
        </Box>
      )}

      {/* Stats panel (top-right) */}
      <Paper
        elevation={4}
        sx={{
          position: 'absolute', top: 16, right: 16, zIndex: 1000,
          p: 1.5, minWidth: 190,
          background: 'rgba(13,20,38,0.88)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(30,136,229,0.3)',
        }}
      >
        <Typography variant="caption" sx={{ color: '#90caf9', fontWeight: 700, display: 'block', mb: 1 }}>
          Снапшот
        </Typography>
        {stats.loading && <LinearProgress sx={{ mb: 1 }} />}
        {stats.data && [
          { label: 'Всего ВС',    value: stats.data.total,          color: '#90caf9' },
          { label: 'В воздухе',  value: stats.data.airborne,       color: '#42a5f5' },
          { label: 'На земле',   value: stats.data.on_ground,      color: '#546e7a' },
          { label: 'Стран',      value: stats.data.countries_count, color: '#66bb6a' },
          { label: 'Макс. ск.', value: stats.data.max_speed_kmh != null ? `${Math.round(stats.data.max_speed_kmh)} км/ч` : '—', color: '#ffa726' },
          { label: 'Макс. выс.', value: stats.data.max_altitude_m != null ? `${Math.round(stats.data.max_altitude_m)} м` : '—', color: '#ab47bc' },
        ].map(({ label, value, color }) => (
          <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#78909c' }}>{label}</Typography>
            <Typography variant="caption" sx={{ color, fontWeight: 700, fontFamily: 'monospace' }}>{value}</Typography>
          </Box>
        ))}
      </Paper>

      {/* Legend */}
      <Paper
        elevation={4}
        sx={{
          position: 'absolute', bottom: 32, right: 16, zIndex: 1000,
          p: 1.5, minWidth: 160,
          background: 'rgba(13,20,38,0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(30,136,229,0.25)',
        }}
      >
        <Typography variant="caption" sx={{ color: '#90caf9', fontWeight: 700, display: 'block', mb: 1 }}>
          Легенда
        </Typography>
        {[
          { color: '#42a5f5', label: 'В воздухе' },
          { color: '#ff8f00', label: 'Высокая скорость' },
          { color: '#546e7a', label: 'На земле' },
        ].map(({ color, label }) => (
          <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
            <Typography variant="caption" sx={{ color: '#e3f2fd' }}>{label}</Typography>
          </Box>
        ))}
      </Paper>
    </Box>
  )
}
