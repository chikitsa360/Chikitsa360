/**
 * Demo: White-label client branding example.
 * Duplicate this file and rename to your client's slug to add a new client.
 */
import type { BrandTheme } from '../types'

export const demoClientTheme: BrandTheme = {
  meta: {
    appName: 'MediFlow',
    clientId: 'mediflow',
    supportEmail: 'help@mediflow.com',
    websiteUrl: 'https://mediflow.com',
    tagline: 'Streamlined Patient Care',
  },
  assets: {
    logoUrl: '/brand/mediflow/logo.svg',
    logoAlt: 'MediFlow',
    faviconUrl: '/brand/mediflow/favicon.ico',
  },
  colors: {
    primary: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
      950: '#052e16',
    },
    secondary: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
    accent: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
    success: {
      50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac',
      400: '#4ade80', 500: '#22c55e', 600: '#16a34a', 700: '#15803d',
      800: '#166534', 900: '#14532d', 950: '#052e16',
    },
    warning: {
      50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d',
      400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309',
      800: '#92400e', 900: '#78350f', 950: '#451a03',
    },
    error: {
      50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af',
      400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c',
      800: '#9f1239', 900: '#881337', 950: '#4c0519',
    },
  },
  typography: {
    fontFamily: {
      sans: 'Nunito, ui-sans-serif, system-ui, sans-serif',
      mono: 'ui-monospace, monospace',
      heading: 'Nunito, ui-sans-serif, system-ui, sans-serif',
    },
    fontSizeBase: '16px',
  },
  cssVariables: {
    '--color-primary': '34 197 94',       // green-500
    '--color-primary-foreground': '255 255 255',
    '--color-secondary': '107 114 128',
    '--color-secondary-foreground': '255 255 255',
    '--color-accent': '59 130 246',       // blue-500
    '--color-accent-foreground': '255 255 255',
    '--color-background': '255 255 255',
    '--color-foreground': '17 24 39',
    '--color-muted': '243 244 246',
    '--color-muted-foreground': '107 114 128',
    '--color-border': '229 231 235',
    '--color-ring': '34 197 94',
    '--radius': '0.75rem',
  },
}
