/**
 * Brand resolution for the web app.
 * Uses NEXT_PUBLIC_CLIENT_ID env var set at build/runtime per deployment.
 */
import { getBrandTheme, themeToCssVars } from '@cliniqly/branding'
import type { BrandTheme } from '@cliniqly/branding'

const clientId = process.env['NEXT_PUBLIC_CLIENT_ID'] ?? 'cliniqly'

export const brand: BrandTheme = getBrandTheme(clientId)
export const brandCssVars: string = themeToCssVars(brand)
