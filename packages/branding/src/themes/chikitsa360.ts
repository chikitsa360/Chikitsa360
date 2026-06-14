import type { BrandTheme } from '../types'

/**
 * Chikitsa360 — Complete Care. 360° Health Insight.
 *
 * Primary:  Royal blue  (#1B40AF) — used for "Chikitsa" wordmark & icon base
 * Accent:   Teal/cyan   (#00B09B) — used for "360" wordmark & icon gradient tip
 */
export const chikitsa360Theme: BrandTheme = {
  meta: {
    appName: 'Chikitsa360',
    clientId: 'chikitsa360',
    supportEmail: 'support@chikitsa360.com',
    websiteUrl: 'https://chikitsa360.com',
    tagline: 'Complete Care. 360° Health Insight.',
  },
  assets: {
    /** Transparent background — use on white/light UI surfaces */
    logoUrl: '/brand/chikitsa360/logo-transparent.png',
    logoAlt: 'Chikitsa360',
    faviconUrl: '/brand/chikitsa360/logo-transparent.png',
    /** White-background version — use on dark surfaces */
    logoDarkUrl: '/brand/chikitsa360/logo.png',
  },
  colors: {
    primary: {
      50:  '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#3b5bdb',
      600: '#2545c4',
      700: '#1b40af',   // brand royal blue
      800: '#153394',
      900: '#102878',
      950: '#0a1a55',
    },
    secondary: {
      50:  '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
      950: '#042f2e',
    },
    accent: {
      50:  '#f0fdfb',
      100: '#ccfbf5',
      200: '#99f6eb',
      300: '#5eead8',
      400: '#2dd4bf',
      500: '#00b09b',   // brand teal
      600: '#009984',
      700: '#007d6b',
      800: '#006255',
      900: '#004d43',
      950: '#003330',
    },
    neutral: {
      50:  '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
    success: {
      50:  '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
      400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
      800: '#166534', 900: '#14532d', 950: '#052e16',
    },
    warning: {
      50:  '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
      400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
      800: '#92400e', 900: '#78350f', 950: '#451a03',
    },
    error: {
      50:  '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
      400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c',
      800: '#9f1239', 900: '#881337', 950: '#4c0519',
    },
  },
  typography: {
    fontFamily: {
      sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
      mono: 'ui-monospace, monospace',
      heading: 'Inter, ui-sans-serif, system-ui, sans-serif',
    },
    fontSizeBase: '16px',
  },
  cssVariables: {
    // Royal blue primary (matches "Chikitsa" wordmark)
    '--color-primary':            '27 64 175',
    '--color-primary-foreground': '255 255 255',

    // Teal secondary (matches "360" wordmark & icon gradient)
    '--color-secondary':            '0 176 155',
    '--color-secondary-foreground': '255 255 255',

    // Teal accent for highlights/CTAs
    '--color-accent':            '0 176 155',
    '--color-accent-foreground': '255 255 255',

    '--color-background':        '255 255 255',
    '--color-foreground':        '15 23 42',
    '--color-card':              '255 255 255',
    '--color-card-foreground':   '15 23 42',
    '--color-muted':             '241 245 249',
    '--color-muted-foreground':  '100 116 139',
    '--color-border':            '226 232 240',
    '--color-ring':              '27 64 175',

    '--radius': '0.5rem',
  },
}
