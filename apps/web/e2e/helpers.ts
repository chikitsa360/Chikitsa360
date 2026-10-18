import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

/**
 * Seeded test data — created by `pnpm --filter @chikitsa360/web db:seed`
 * (prisma/seed.ts). The OTP 123456 is the dev bypass code, active whenever
 * UPSTASH_REDIS_REST_URL is unset or DEV_OTP_BYPASS is set (lib/otp.ts).
 */
/** Storage-state file written by auth.setup.ts and reused by authed specs. */
export const OWNER_STATE = 'e2e/.auth/owner.json'

export const SEED = {
  clinicSlug: 'city-care',
  clinicName: 'City Care Clinic',
  otp: '123456',
  owner: { phone: '9999999999', name: 'Dr. Priya Sharma' },
  doctor: { phone: '9888888888', name: 'Dr. Arjun Mehta' },
  receptionist: { phone: '9666666666', name: 'Sneha Patel' },
  patient: { phone: '9111111111', name: 'Rahul Sharma' },
} as const

/** Drives the two-step phone → OTP login flow and waits for the dashboard. */
export async function login(page: Page, phone: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Mobile Number').fill(phone)
  await page.getByRole('button', { name: 'Send OTP' }).click()

  await expect(page.getByLabel('Enter OTP')).toBeVisible()
  await page.getByLabel('Enter OTP').fill(SEED.otp)
  await page.getByRole('button', { name: 'Verify & Login' }).click()

  await page.waitForURL('**/dashboard', { timeout: 15_000 })
}
