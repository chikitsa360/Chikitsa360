import { test, expect } from '@playwright/test'
import { SEED, login } from './helpers'

test.describe('authentication', () => {
  test('owner logs in with phone + OTP and lands on the dashboard', async ({ page }) => {
    await login(page, SEED.owner.phone)
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible({
      timeout: 15_000,
    })
  })

  test('receptionist logs in and lands on the dashboard', async ({ page }) => {
    await login(page, SEED.receptionist.phone)
    await expect(page.getByText(/Good (morning|afternoon|evening)/)).toBeVisible({
      timeout: 15_000,
    })
  })

  test('invalid phone number shows a validation error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Mobile Number').fill('12345')
    await page.getByRole('button', { name: 'Send OTP' }).click()
    await expect(page.getByText('Enter a valid 10-digit Indian mobile number')).toBeVisible()
  })

  test('wrong OTP shows an error and does not log in', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Mobile Number').fill(SEED.owner.phone)
    await page.getByRole('button', { name: 'Send OTP' }).click()

    await page.getByLabel('Enter OTP').fill('000000')
    await page.getByRole('button', { name: 'Verify & Login' }).click()

    await expect(page.getByText(/Incorrect OTP/)).toBeVisible()
    expect(page.url()).toContain('/login')
  })
})
