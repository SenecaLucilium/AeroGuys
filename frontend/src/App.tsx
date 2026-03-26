import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Typography, AppBar, Toolbar, Divider,
} from '@mui/material'
import AirlinesIcon       from '@mui/icons-material/Airlines'
import RadarIcon          from '@mui/icons-material/Radar'
import LocationCityIcon   from '@mui/icons-material/LocationCity'
import FlightIcon         from '@mui/icons-material/Flight'
import AltRouteIcon       from '@mui/icons-material/AltRoute'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import RealtimePage from '@pages/RealtimePage'
import AirportsPage from '@pages/AirportsPage'
import AircraftPage from '@pages/AircraftPage'
import RoutesPage   from '@pages/RoutesPage'

const DRAWER_WIDTH = 240

const NAV = [
  { path: '/realtime', label: 'Реальное время', icon: <RadarIcon /> },
  { path: '/airports',  label: 'Аэропорты',      icon: <LocationCityIcon /> },
  { path: '/aircraft',  label: 'Воздушные суда', icon: <FlightIcon /> },
  { path: '/routes',    label: 'Маршруты',       icon: <AltRouteIcon /> },
]

function NavDrawer() {
  const location = useLocation()
  const navigate  = useNavigate()

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
                  '& .MuiListItemText-primary': {
                    color: 'primary.main',
                    fontWeight: 600,
                  },
                },
                '&:not(.Mui-selected)': {
                  pl: 2,
                  borderLeft: '3px solid transparent',
                },
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

      {/* Footer */}
      <Box sx={{ mt: 'auto', p: 2 }}>
        <Divider sx={{ mb: 1.5 }} />
        <Typography variant="caption" color="text.disabled" display="block">
          OpenSky Network · PostgreSQL
        </Typography>
        <Typography variant="caption" color="text.disabled">
          AeroGuys v1.0
        </Typography>
      </Box>
    </Drawer>
  )
}

function AppLayout() {
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
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '48px',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/realtime" replace />} />
          <Route path="/realtime" element={<RealtimePage />} />
          <Route path="/airports" element={<AirportsPage />} />
          <Route path="/aircraft" element={<AircraftPage />} />
          <Route path="/routes"   element={<RoutesPage />} />
        </Routes>
      </Box>
    </Box>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}
