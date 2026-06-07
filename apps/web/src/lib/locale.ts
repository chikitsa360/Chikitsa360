'use server'

import { cookies } from 'next/headers'
import { type Locale, isValidLocale, defaultLocale } from '@/i18n/routing'

export async function setLocale(locale: string): Promise<void> {
  if (!isValidLocale(locale)) return
  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })
}

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('NEXT_LOCALE')?.value
  return raw && isValidLocale(raw) ? raw : defaultLocale
}
