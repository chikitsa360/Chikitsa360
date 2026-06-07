/**
 * Brand resolution for the web app.
 * Uses NEXT_PUBLIC_CLIENT_ID env var set at build/runtime per deployment.
 */
import { getBrandTheme, themeToCssVars } from '@chikitsa360/branding'
import type { BrandTheme } from '@chikitsa360/branding'

const clientId = process.env['NEXT_PUBLIC_CLIENT_ID'] ?? 'chikitsa360'

export const brand: BrandTheme = getBrandTheme(clientId)
export const brandCssVars: string = themeToCssVars(brand)
