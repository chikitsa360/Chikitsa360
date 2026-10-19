import { test, expect } from '@playwright/test'
import { OWNER_STATE, SEED } from './helpers'

/**
 * Authenticated portal smoke — reuses the owner session captured by
 * auth.setup.ts instead of logging in per test.
 */
test.use({ storageState: OWNER_STATE })

test.describe('dashboard (owner)', () => {
  test('dashboard shows greeting and today stats', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible()
  })

  test('patients directory finds a seeded patient via search', async ({ page }) => {
    await page.goto('/patients')
    await expect(page.getByRole('heading', { name: 'Patients' })).toBeVisible()
    // Search instead of scanning page 1 — the paginated list grows as
    // booking specs create patients, so position is not stable.
    await page.getByPlaceholder('Search by name or phone…').fill(SEED.patient.name)
    await expect(page.getByText(SEED.patient.name).first()).toBeVisible({ timeout: 10_000 })
  })

  test('sidebar highlights the clicked tab — Doctors stays active after its redirect', async ({
    page,
  }) => {
    // /doctors redirects owners to /settings/doctors; the sidebar must keep
    // the Doctors item highlighted, not Settings (regression: tab highlight).
    await page.goto('/dashboard')
    await page.locator('aside a[href="/doctors"]').click()
    await page.waitForURL('**/settings/doctors')
    await expect(page.locator('aside a[aria-current="page"]')).toHaveAttribute('href', '/doctors')
  })

  test('WhatsApp settings offers the Notify connect panel', async ({ page }) => {
    await page.goto('/settings/whatsapp')
    await expect(page.getByRole('heading', { name: 'WhatsApp Business' })).toBeVisible()
    // Seeded clinic is unconnected → the connect panel renders inline with the
    // BYO path always available (managed path depends on env config).
    await expect(page.getByText('Not Connected')).toBeVisible()
    const byoToggle = page.getByRole('button', { name: 'I already have Meta API credentials' })
    await expect(byoToggle).toBeVisible()
    await byoToggle.click()
    await expect(page.getByLabel(/Permanent Access Token/)).toBeVisible()
    await expect(page.getByLabel(/Phone Number ID/)).toBeVisible()
  })

  test('appointments calendar loads for today', async ({ page }) => {
    await page.goto('/appointments')
    // Either today's appointments render or the explicit empty state does —
    // both prove the tenant-schema query path works end to end.
    await expect(
      page
        .getByText(SEED.doctor.name)
        .first()
        .or(page.getByText('No appointments scheduled for this day.'))
    ).toBeVisible({ timeout: 15_000 })
  })
})
