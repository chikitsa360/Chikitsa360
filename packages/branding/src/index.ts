export type { BrandTheme, BrandColors, BrandMeta, BrandAssets, BrandTypography } from './types'
export { cliniqlyTheme } from './themes/cliniqly'
export { demoClientTheme } from './themes/demo-client'

import { cliniqlyTheme } from './themes/cliniqly'
import { demoClientTheme } from './themes/demo-client'
import type { BrandTheme } from './types'

const themes: Record<string, BrandTheme> = {
  cliniqly: cliniqlyTheme,
  mediflow: demoClientTheme,
}

/**
 * Resolve branding for a given client ID.
 * Falls back to the default Cliniqly brand.
 */
export function getBrandTheme(clientId?: string): BrandTheme {
  if (!clientId) return cliniqlyTheme
  return themes[clientId] ?? cliniqlyTheme
}

/**
 * Convert a BrandTheme's cssVariables into a CSS :root block string.
 * Inject this into the page <head> for server-side rendering.
 */
export function themeToCssVars(theme: BrandTheme): string {
  const vars = Object.entries(theme.cssVariables)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n')
  return `:root {\n${vars}\n}`
}

/**
 * Register a new client theme at runtime.
 */
export function registerTheme(clientId: string, theme: BrandTheme): void {
  themes[clientId] = theme
}
