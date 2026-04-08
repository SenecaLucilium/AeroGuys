import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, AppBar, Toolbar, Divider, Tooltip,
  CircularProgress, Snackbar, Alert,
} from '@mui/material'
import AirlinesIcon               from '@mui/icons-material/Airlines'
import RadarIcon                  from '@mui/icons-material/Radar'
import LocationCityIcon           from '@mui/icons-material/LocationCity'
import FlightIcon                 from '@mui/icons-material/Flight'
import AltRouteIcon               from '@mui/icons-material/AltRoute'
import PublicIcon                 from '@mui/icons-material/Public'
import SettingsBackupRestoreIcon  from '@mui/icons-material/SettingsBackupRestore'
import StorageIcon                from '@mui/icons-material/Storage'
import AssessmentIcon             from '@mui/icons-material/Assessment'
import { useState }               from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'

import RealtimePage from '@pages/RealtimePage'
import AirportsPage from '@pages/AirportsPage'
import AircraftPage from '@pages/AircraftPage'
import RoutesPage   from '@pages/RoutesPage'
import MapPage      from '@pages/MapPage'
import InitPage     from '@pages/InitPage'

import { DataProvider, useDataContext } from '@/context/DataContext'
import { downloadRawCsv, downloadAnalyticsCsv } from '@api/export'

const DRAWER_WIDTH = 240

const NAV = [
  { path: '/realtime', label: 'Реальное время', icon: <RadarIcon /> },
  { path: '/airports',  label: 'Аэропорты',      icon: <LocationCityIcon /> },
  { path: '/aircraft',  label: 'Воздушные суда', icon: <FlightIcon /> },
  { path: '/routes',    label: 'Маршруты',       icon: <AltRouteIcon /> },
  { path: '/map',       label: 'Карта',          icon: <PublicIcon /> },
]

function NavDrawer() {
  const location = useLocation()
  const navigate  = useNavigate()
  const { initInfo, reset } = useDataContext()

  const [exportLoading, setExportLoading] = useState<'raw' | 'analytics' | null>(null)
  const [exportError,   setExportError]   = useState<string | null>(null)

  async function handleExport(type: 'raw' | 'analytics') {
    setExportLoading(type)
    setExportError(null)
    try {
      if (type === 'raw') await downloadRawCsv()
      else                await downloadAnalyticsCsv()
    } catch (e: any) {
      setExportError(e.message ?? 'Ошибка экспорта')
    } finally {
      setExportLoading(null)
    }
  }

  function handleReset() {
    reset()
    navigate('/init', { replace: true })
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #0d1426 0%, #080d1a 100%)',
          borderRight: '1px solid rgba(30, 136, 229, 0.18)',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Logo */}
      <Toolbar sx={{ justifyContent: 'flex-start', gap: 1.5, py: 2.5 }}>
        <AirlinesIcon sx={{ color: 'primary.main', fontSize: 30 }} />
        <Box>
          <Typography variant="h6" fontWeight={700} color="primary.main" lineHeight={1}>
            AEROGUYS
          </Typography>
          <Typography variant="caption" color="text.secondary" lineHeight={1}>
            aviation analytics
          </Typography>
        </Box>
      </Toolbar>

      <Divider />

      {/* Main navigation */}
      <List sx={{ pt: 1.5, px: 1 }}>
        {NAV.map(({ path, label, icon }) => {
          const active = location.pathname === path
          return (
            <ListItemButton
              key={path}
              onClick={() => navigate(path)}
              selected={active}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  background: 'rgba(30, 136, 229, 0.14)',
                  borderLeft: '3px solid #1e88e5',
                  pl: '13px',
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                  '& .MuiListItemText-primary': { color: 'primary.main', fontWeight: 600 },
                },
                '&:not(.Mui-selected)': { pl: 2, borderLeft: '3px solid transparent' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: active ? 'primary.main' : 'text.secondary' }}>
                {icon}
              </ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{ fontSize: '0.9rem' }}
              />
            </ListItemButton>
          )
        })}
      </List>

      {/* ── Bottom section ──────────────────────────────────────── */}
      <Box sx={{ mt: 'auto', px: 1, pb: 1.5 }}>
        <Divider sx={{ mb: 1 }} />

        {/* Data source badge */}
        {initInfo && (
          <Box sx={{ px: 1, mb: 0.5 }}>
            <Typography variant="caption" color="text.disabled">
              Источник:{' '}
              <Typography component="span" variant="caption" color="primary.main" fontWeight={600}>
                {initInfo.mode === 'realtime' ? 'OpenSky API' : 'CSV-файл'}
              </Typography>
            </Typography>
          </Box>
        )}

        {/* Export raw CSV */}
        <Tooltip title="Скачать все сырые рейсы в CSV" placement="right">
          <span>
            <ListItemButton
              onClick={() => handleExport('raw')}
              disabled={exportLoading === 'raw'}
              sx={{
                borderRadius: 2, mb: 0.5, pl: 2,
                borderLeft: '3px solid transparent',
                opacity: exportLoading === 'raw' ? 0.6 : 1,
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'text.secondary' }}>
                {exportLoading === 'raw'
                  ? <CircularProgress size={18} color="inherit" />
                  : <StorageIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText
                primary="Сырые данные"
                primaryTypographyProps={{ fontSize: '0.82rem', color: 'text.secondary' }}
              />
            </ListItemButton>
          </span>
        </Tooltip>

        {/* Export analytics ZIP */}
        <Tooltip title="Скачать всю аналитику в ZIP (4 CSV внутри)" placement="right">
          <span>
            <ListItemButton
              onClick={() => handleExport('analytics')}
              disabled={exportLoading === 'analytics'}
              sx={{
                borderRadius: 2, mb: 0.5, pl: 2,
                borderLeft: '3px solid transparent',
                opacity: exportLoading === 'analytics' ? 0.6 : 1,
              }}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'text.secondary' }}>
                {exportLoading === 'analytics'
                  ? <CircularProgress size={18} color="inherit" />
                  : <AssessmentIcon fontSize="small" />}
              </ListItemIcon>
              <ListItemText
                primary="Вся аналитика"
                primaryTypographyProps={{ fontSize: '0.82rem', color: 'text.secondary' }}
              />
            </ListItemButton>
          </span>
        </Tooltip>

        {/* Reset / change data source */}
        <Tooltip title="Вернуться к выбору источника данных" placement="right">
          <ListItemButton
            onClick={handleReset}
            sx={{
              borderRadius: 2, mb: 0.5, pl: 2,
              borderLeft: '3px solid transparent',
            }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: 'text.secondary' }}>
              <SettingsBackupRestoreIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Сменить данные"
              primaryTypographyProps={{ fontSize: '0.82rem', color: 'text.secondary' }}
            />
          </ListItemButton>
        </Tooltip>

        <Box sx={{ px: 1, mt: 0.5 }}>
          <Divider sx={{ mb: 1 }} />
          <Typography variant="caption" color="text.disabled" display="block">
            OpenSky Network · PostgreSQL
          </Typography>
          <Typography variant="caption" color="text.disabled">
            AeroGuys v1.0
          </Typography>
        </Box>
      </Box>

      {/* Export error snackbar */}
      <Snackbar
        open={!!exportError}
        autoHideDuration={4000}
        onClose={() => setExportError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setExportError(null)} sx={{ width: '100%' }}>
          {exportError}
        </Alert>
      </Snackbar>
    </Drawer>
  )
}

// ─── Layout when user is NOT yet initialised ─────────────────────────────────
function InitLayout() {
  return (
    <Routes>
      <Route path="/init" element={<InitPage />} />
      <Route path="*"    element={<Navigate to="/init" replace />} />
    </Routes>
  )
}

// ─── Layout when user IS initialised ─────────────────────────────────────────
function MainLayout() {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          background: 'rgba(8, 13, 26, 0.80)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(30, 136, 229, 0.18)',
          ml: `${DRAWER_WIDTH}px`,
          width: `calc(100% - ${DRAWER_WIDTH}px)`,
        }}
      >
        <Toolbar variant="dense">
          <Typography variant="body2" color="text.secondary">
            Система мониторинга и анализа авиационного трафика
          </Typography>
        </Toolbar>
      </AppBar>

      <NavDrawer />

      <Box
        component="main"
        sx={{ flexGrow: 1, p: 3, mt: '48px', minHeight: '100vh', bgcolor: 'background.default' }}
      >
        <Routes>
          <Route path="/"         element={<Navigate to="/realtime" replace />} />
          <Route path="/init"     element={<Navigate to="/realtime" replace />} />
          <Route path="/realtime" element={<RealtimePage />} />
          <Route path="/airports" element={<AirportsPage />} />
          <Route path="/aircraft" element={<AircraftPage />} />
          <Route path="/routes"   element={<RoutesPage />} />
          <Route path="/map"      element={<MapPage />} />
        </Routes>
      </Box>
    </Box>
  )
}

// ─── Root: chooses which layout to render based on init state ─────────────────
function AppShell() {
  const { initInfo } = useDataContext()
  return initInfo ? <MainLayout /> : <InitLayout />
}

export default function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <AppShell />
      </DataProvider>
    </BrowserRouter>
  )
}
