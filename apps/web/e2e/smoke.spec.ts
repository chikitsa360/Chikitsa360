import { test, expect } from '@playwright/test'
import { SEED } from './helpers'

test.describe('smoke — app boots and public surface responds', () => {
  test('login page renders the phone form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
    await expect(page.getByLabel('Mobile Number')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send OTP' })).toBeVisible()
  })

  test('unauthenticated /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/login**')
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })

  test('unknown route renders the 404 page', async ({ page }) => {
    const response = await page.goto('/this-route-does-not-exist')
    expect(response?.status()).toBe(404)
  })

  test('public slots API validates input', async ({ request }) => {
    const res = await request.get('/api/v1/slots/available')
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  test('clinic by-slug API returns the seeded clinic', async ({ request }) => {
    const res = await request.get(`/api/v1/clinics/by-slug/${SEED.clinicSlug}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.name).toBe(SEED.clinicName)
    expect(body.slug).toBe(SEED.clinicSlug)
  })

  test('clinic by-slug API 404s for unknown slug', async ({ request }) => {
    const res = await request.get('/api/v1/clinics/by-slug/no-such-clinic-xyz')
    expect(res.status()).toBe(404)
  })

  test('booking API rejects malformed payloads', async ({ request }) => {
    const res = await request.post('/api/v1/booking', { data: { nonsense: true } })
    expect(res.status()).toBe(400)
  })

  test('WhatsApp webhook rejects a bad verify token', async ({ request }) => {
    const res = await request.get(
      '/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123'
    )
    expect(res.status()).toBe(403)
  })
})
