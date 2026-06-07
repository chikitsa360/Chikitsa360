import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './redis'

// 100 requests per second per clinicId — general API rate limit (NFR-21)
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 s'),
  prefix: 'ratelimit:api',
  analytics: true,
})

// OTP send rate limit: 3 requests per 10 minutes per phone number
export const otpRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '10 m'),
  prefix: 'ratelimit:otp',
  analytics: true,
})

export async function checkApiRateLimit(
  clinicId: string
): Promise<{ success: boolean; retryAfter?: number }> {
  const { success, reset } = await apiRateLimit.limit(clinicId)
  if (!success) {
    return { success: false, retryAfter: Math.ceil((reset - Date.now()) / 1000) }
  }
  return { success: true }
}
