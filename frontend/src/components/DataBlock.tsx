import {
  Card, CardHeader, CardContent, IconButton, Tooltip,
  Typography, Box, Skeleton, Alert, Chip,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  loading: boolean
  error: string | null
  refetch: () => void
  children?: ReactNode
  count?: number
  headerRight?: ReactNode
}

export function SectionCard({
  title, loading, error, refetch, children, count, headerRight,
}: SectionCardProps) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardHeader
        title={<Typography variant="h6">{title}</Typography>}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 1 }}>
            {count !== undefined && (
              <Chip label={count} size="small" color="primary" variant="outlined" />
            )}
            {headerRight}
            <Tooltip title="Обновить">
              <span>
                <IconButton
                  onClick={refetch}
                  size="small"
                  disabled={loading}
                  color="primary"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        }
      />
      <CardContent sx={{ pt: 1 }}>
        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {[...Array(6)].map((_, i) => (
              <Skeleton
                key={i}
                variant="rectangular"
                height={36}
                sx={{ borderRadius: 1, opacity: 1 - i * 0.12 }}
              />
            ))}
          </Box>
        )}
        {!loading && error && <Alert severity="error">{error}</Alert>}
        {!loading && !error && children}
      </CardContent>
    </Card>
  )
}

