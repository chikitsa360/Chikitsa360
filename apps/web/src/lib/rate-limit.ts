import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './redis'

const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

// No-op limiter used in dev when Redis is not configured
const noopLimit = async () => ({ success: true as const, limit: 9999, remaining: 9999, reset: Date.now(), pending: Promise.resolve() })

// 100 requests per second per clinicId — general API rate limit (NFR-21)
const _apiRateLimit = hasRedis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 s'), prefix: 'ratelimit:api', analytics: true })
  : null

// OTP send rate limit: 3 requests per 10 minutes per phone number
const _otpRateLimit = hasRedis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '10 m'), prefix: 'ratelimit:otp', analytics: true })
  : null

// Fail open: a Redis outage (quota exhausted, deleted DB, rotated token) must
// degrade to "no rate limiting", never take down login or the API.
export const otpRateLimit = {
  limit: async (phone: string) => {
    if (!_otpRateLimit) return noopLimit()
    try {
      return await _otpRateLimit.limit(phone)
    } catch (err) {
      console.error('[rate-limit] OTP limiter failed, allowing request:', err)
      return noopLimit()
    }
  },
}

export async function checkApiRateLimit(
  clinicId: string
): Promise<{ success: boolean; retryAfter?: number }> {
  if (!_apiRateLimit) return { success: true }
  try {
    const { success, reset } = await _apiRateLimit.limit(clinicId)
    if (!success) {
      return { success: false, retryAfter: Math.ceil((reset - Date.now()) / 1000) }
    }
    return { success: true }
  } catch (err) {
    console.error('[rate-limit] API limiter failed, allowing request:', err)
    return { success: true }
  }
}
