import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000'
const port = new URL(baseURL).port || '3000'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['github']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Logs in once as the seeded owner and saves session state for reuse
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
      // Desktop-layout portal specs stay on chromium; mobile covers the
      // public surface (login, booking) where patients actually are.
      testIgnore: /dashboard\.spec\.ts/,
    },
  ],
  webServer: {
    // CI runs the production build (`next build` happens in the workflow);
    // locally we reuse the dev server if one is already running on $BASE_URL.
    command: process.env.CI ? 'pnpm start' : 'pnpm dev',
    url: `${baseURL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      PORT: port,
      // Forces the fixed OTP (123456) during e2e runs even when a local
      // .env.local has real Redis configured. Never set in production.
      DEV_OTP_BYPASS: process.env.DEV_OTP_BYPASS ?? '123456',
    },
  },
})
