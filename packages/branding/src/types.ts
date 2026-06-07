export interface ColorScale {
  50: string
  100: string
  200: string
  300: string
  400: string
  500: string
  600: string
  700: string
  800: string
  900: string
  950: string
}

export interface BrandColors {
  primary: ColorScale
  secondary: ColorScale
  accent: ColorScale
  neutral: ColorScale
  success: ColorScale
  warning: ColorScale
  error: ColorScale
}

export interface BrandTypography {
  fontFamily: {
    sans: string
    mono: string
    heading: string
  }
  fontSizeBase: string
}

export interface BrandAssets {
  logoUrl: string
  logoAlt: string
  faviconUrl: string
  /** Optional dark mode logo */
  logoDarkUrl?: string
}

export interface BrandMeta {
  /** Human-readable name shown in UI */
  appName: string
  /** Slug used in URLs and env configs */
  clientId: string
  supportEmail: string
  websiteUrl: string
  /** Used for browser tab title suffix */
  tagline?: string
}

export interface BrandTheme {
  meta: BrandMeta
  assets: BrandAssets
  colors: BrandColors
  typography: BrandTypography
  /** Tailwind CSS variable overrides injected as :root CSS vars */
  cssVariables: Record<string, string>
}
