import { test, expect } from '@playwright/test'

/** Throwaway verification: onboarding legal checkboxes render links, not raw keys. */
test('onboarding step 1 renders legal agreement links', async ({ page }) => {
  test.skip(test.info().project.name !== 'chromium', 'single-browser check')

  // Owner with no clinic → lands on /onboarding
  await page.goto('/login')
  await page.getByLabel('Mobile Number').fill('9000000001')
  await page.getByRole('button', { name: 'Send OTP' }).click()
  await page.getByLabel('Enter OTP').fill('123456')
  await page.getByRole('button', { name: 'Verify & Login' }).click()
  await page.waitForURL('**/onboarding**', { timeout: 20_000 })

  // No raw translation keys anywhere
  await expect(page.getByText(/onboarding\.step1\./)).toHaveCount(0)

  // All three labels render with working links
  for (const [name, href] of [
    ['Terms of Service', '/legal/terms'],
    ['Privacy Policy', '/legal/privacy'],
    ['Data Processing Agreement', '/legal/dpa'],
  ] as const) {
    const link = page.getByRole('link', { name })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', href)
  }

  // The linked pages actually load
  const res = await page.request.get('/legal/terms')
  expect(res.status()).toBe(200)
})
