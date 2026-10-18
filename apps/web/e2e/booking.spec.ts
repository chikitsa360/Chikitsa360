import { test, expect } from '@playwright/test'
import { SEED } from './helpers'

/** Unique 10-digit Indian mobile per run so patient de-dup never collides. */
function uniquePhone(): string {
  return `9${Date.now().toString().slice(-9)}`
}

test.describe('public booking flow (no auth)', () => {
  test('booking page renders clinic header and doctors', async ({ page }) => {
    await page.goto(`/book/${SEED.clinicSlug}`)
    await expect(page.getByRole('heading', { name: SEED.clinicName })).toBeVisible()
    await expect(page.getByRole('button', { name: SEED.doctor.name, exact: true })).toBeVisible()
  })

  test('unknown clinic slug 404s', async ({ page }) => {
    const response = await page.goto('/book/no-such-clinic-xyz')
    expect(response?.status()).toBe(404)
  })

  test('patient books an appointment end to end', async ({ page }) => {
    await page.goto(`/book/${SEED.clinicSlug}`)
    await expect(page.getByRole('heading', { name: SEED.clinicName })).toBeVisible()

    // Filter to a specific doctor so the slot grid is deterministic
    await page.getByRole('button', { name: SEED.doctor.name, exact: true }).click()

    // Seeded working hours are Mon–Sat 09:00–17:00, so the next few days
    // always have open slots. Slot buttons are labelled "9:00 AM with <doctor>".
    const firstSlot = page
      .getByRole('button', { name: new RegExp(`(AM|PM) with ${SEED.doctor.name}`) })
      .first()
    await expect(firstSlot).toBeVisible({ timeout: 15_000 })
    await firstSlot.click()

    await page.getByLabel(/Full Name/).fill('E2E Test Patient')
    await page.getByLabel(/Mobile Number/).fill(uniquePhone())
    await page.getByRole('button', { name: 'Confirm Appointment' }).click()

    await expect(page.getByText('Appointment Confirmed!')).toBeVisible({ timeout: 15_000 })
  })

  test('booking a taken slot returns SLOT_TAKEN', async ({ request }) => {
    // Resolve a real doctor + slot via the public API, book it, then book it again.
    const slotsRes = await request.get(
      `/api/v1/slots/available?slug=${SEED.clinicSlug}&days=6`
    )
    expect(slotsRes.status()).toBe(200)
    const slotsBody = await slotsRes.json()
    const slots: Array<{ doctorId: string; date: string; startTime: string }> =
      slotsBody.slots ?? []
    expect(slots.length).toBeGreaterThan(0)
    const slot = slots[slots.length - 1]!

    const payload = {
      clinicSlug: SEED.clinicSlug,
      doctorId: slot.doctorId,
      date: slot.date,
      startTime: slot.startTime,
      patientName: 'E2E Race Patient',
      patientPhone: uniquePhone(),
    }

    const first = await request.post('/api/v1/booking', { data: payload })
    expect(first.status()).toBe(201)

    const second = await request.post('/api/v1/booking', {
      data: { ...payload, patientPhone: uniquePhone() },
    })
    expect(second.status()).toBe(409)
  })
})
