import React, { useRef, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Button,
  CircularProgress, Alert, Divider, Chip,
} from '@mui/material'
import RadarIcon        from '@mui/icons-material/Radar'
import UploadFileIcon   from '@mui/icons-material/UploadFile'
import AirlinesIcon     from '@mui/icons-material/Airlines'
import { useNavigate }  from 'react-router-dom'
import { initRealtime, initUploadCsv } from '@api/init'
import { useDataContext } from '@/context/DataContext'

export default function InitPage() {
  const { setInitialized } = useDataContext()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading,    setLoading]    = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error,      setError]      = useState<string | null>(null)

  async function handleRealtime() {
    setLoading(true)
    setError(null)
    setLoadingMsg('Загрузка данных из OpenSky Network API...')
    try {
      const result = await initRealtime()
      setInitialized({ mode: 'realtime', ...result })
      navigate('/realtime', { replace: true })
    } catch (e: any) {
      setError(e.response?.data?.detail ?? e.message ?? 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setError(null)
    setLoadingMsg(`Обработка файла «${file.name}»…`)
    try {
      const result = await initUploadCsv(file)
      setInitialized({ mode: 'csv', ...result })
      navigate('/realtime', { replace: true })
    } catch (e: any) {
      setError(e.response?.data?.detail ?? e.message ?? 'Неизвестная ошибка')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 3,
      }}
    >
      {/* Logo / Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <AirlinesIcon sx={{ color: 'primary.main', fontSize: 44 }} />
        <Box>
          <Typography variant="h4" fontWeight={700} color="primary.main" lineHeight={1}>
            AEROGUYS
          </Typography>
          <Typography variant="caption" color="text.secondary">
            aviation analytics platform
          </Typography>
        </Box>
      </Box>

      <Typography variant="h6" color="text.secondary" sx={{ mb: 4, mt: 1, textAlign: 'center' }}>
        Выберите источник данных для аналитики
      </Typography>

      {/* Loading */}
      {loading && (
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <CircularProgress size={52} sx={{ mb: 2 }} />
          <Typography color="text.secondary">{loadingMsg}</Typography>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
            Пожалуйста, подождите — это может занять некоторое время
          </Typography>
        </Box>
      )}

      {/* Error */}
      {error && !loading && (
        <Alert
          severity="error"
          sx={{ mb: 3, maxWidth: 680, width: '100%' }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Option cards */}
      {!loading && (
        <Box
          sx={{
            display: 'flex',
            gap: 3,
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: 820,
            width: '100%',
          }}
        >
          {/* ── Real-time card ─────────────────────────────────── */}
          <Card
            sx={{
              flex: '1 1 320px',
              maxWidth: 370,
              border: '1px solid rgba(30, 136, 229, 0.30)',
              cursor: 'pointer',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:hover': {
                borderColor: 'primary.main',
                boxShadow: '0 0 24px rgba(30, 136, 229, 0.22)',
              },
            }}
            onClick={handleRealtime}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 50, height: 50, borderRadius: 2,
                    background: 'rgba(30, 136, 229, 0.14)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <RadarIcon sx={{ color: 'primary.main', fontSize: 30 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600}>Real-time данные</Typography>
                  <Chip label="OpenSky Network" size="small" color="primary" variant="outlined" sx={{ mt: 0.5 }} />
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Button
                variant="contained"
                fullWidth
                sx={{ mt: 2.5 }}
                startIcon={<RadarIcon />}
                onClick={(e) => { e.stopPropagation(); handleRealtime() }}
              >
                Загрузить из API
              </Button>
            </CardContent>
          </Card>

          {/* ── CSV upload card ─────────────────────────────────── */}
          <Card
            sx={{
              flex: '1 1 320px',
              maxWidth: 370,
              border: '1px solid rgba(255, 143, 0, 0.28)',
              cursor: 'pointer',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:hover': {
                borderColor: 'warning.main',
                boxShadow: '0 0 24px rgba(255, 143, 0, 0.18)',
              },
            }}
            onClick={() => fileRef.current?.click()}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box
                  sx={{
                    width: 50, height: 50, borderRadius: 2,
                    background: 'rgba(255, 143, 0, 0.12)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <UploadFileIcon sx={{ color: 'warning.main', fontSize: 30 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={600}>Загрузить CSV</Typography>
                  <Chip label="Свои данные" size="small" color="warning" variant="outlined" sx={{ mt: 0.5 }} />
                </Box>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Button
                variant="outlined"
                fullWidth
                color="warning"
                sx={{ mt: 2.5 }}
                startIcon={<UploadFileIcon />}
                onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
              >
                Выбрать файл CSV
              </Button>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" color="text.disabled">
          Формат CSV: ICAO24, Callsign, Departure Time, Arrival Time, From, To, Duration (min)
        </Typography>
      </Box>
    </Box>
  )
}
