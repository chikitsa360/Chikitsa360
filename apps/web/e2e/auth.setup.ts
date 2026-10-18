import { test as setup } from '@playwright/test'
import { OWNER_STATE, SEED, login } from './helpers'

/**
 * Logs in once as the clinic owner and persists the session cookies.
 * Authenticated specs reuse this state instead of logging in per test.
 */
setup('authenticate as owner', async ({ page }) => {
  await login(page, SEED.owner.phone)
  await page.context().storageState({ path: OWNER_STATE })
})
