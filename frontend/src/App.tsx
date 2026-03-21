import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import RealtimePage from '@pages/RealtimePage'
import AirportsPage from '@pages/AirportsPage'
import AircraftPage from '@pages/AircraftPage'
import RoutesPage   from '@pages/RoutesPage'

const NAV_LINKS = [
  { to: '/realtime', label: 'Реальное время' },
  { to: '/airports',  label: 'Аэропорты'      },
  { to: '/aircraft',  label: 'Воздушные суда' },
  { to: '/routes',    label: 'Маршруты'       },
] as const

export default function App() {
  return (
    <BrowserRouter>
      <nav style={{ display: 'flex', gap: 16, padding: '8px 16px', background: '#1a1a2e' }}>
        {NAV_LINKS.map(({ to, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({ color: isActive ? '#e94560' : '#a8a8b3' })}>
            {label}
          </NavLink>
        ))}
      </nav>

      <main style={{ padding: 16 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/realtime" replace />} />
          <Route path="/realtime" element={<RealtimePage />} />
          <Route path="/airports" element={<AirportsPage />} />
          <Route path="/aircraft" element={<AircraftPage />} />
          <Route path="/routes"   element={<RoutesPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
