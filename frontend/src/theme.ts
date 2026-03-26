import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary:    { main: '#1e88e5' },
    secondary:  { main: '#ff8f00' },
    success:    { main: '#00c853' },
    error:      { main: '#ff1744' },
    warning:    { main: '#ff8f00' },
    background: {
      default: '#080d1a',
      paper:   '#0d1426',
    },
    text: {
      primary:   'rgba(255,255,255,0.92)',
      secondary: 'rgba(255,255,255,0.55)',
      disabled:  'rgba(255,255,255,0.30)',
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#1e88e5 #0d1426',
          '&::-webkit-scrollbar': { width: 8 },
          '&::-webkit-scrollbar-track': { background: '#0d1426' },
          '&::-webkit-scrollbar-thumb': { background: '#1e5799', borderRadius: 4 },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(30, 136, 229, 0.14)',
        },
      },
    },
    MuiCardHeader: {
      styleOverrides: {
        root: { paddingBottom: 8 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: 'rgba(30, 136, 229, 0.08)',
            color: '#90caf9',
            fontWeight: 600,
            fontSize: '0.78rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            borderBottom: '1px solid rgba(30, 136, 229, 0.22)',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: 'rgba(30, 136, 229, 0.05)' },
          '&:last-child td': { borderBottom: 0 },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '8px 12px',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.08)' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
        contained: { boxShadow: 'none', '&:hover': { boxShadow: 'none' } },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: 'rgba(30, 136, 229, 0.18)' },
      },
    },
  },
})
