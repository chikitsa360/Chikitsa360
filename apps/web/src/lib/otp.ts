import { redis } from './redis'

const OTP_TTL_SECONDS = 600 // 10 minutes
const MAX_ATTEMPTS = 3
const LOCKOUT_TTL_SECONDS = 900 // 15 minutes

// ── Dev mode (no Redis) ───────────────────────────────────────────────────
// When running locally without Upstash, skip Redis entirely and accept a
// hardcoded OTP so the auth flow can be tested end-to-end.
// No in-memory store is used — the static OTP is accepted for any nonce,
// because Next.js runs different API routes in separate module contexts and
// a module-level Map cannot be shared between them reliably.

const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

/** Read bypass code at call time so Vercel env var changes take effect after redeploy. */
function getBypassOtp(): string | null {
  if (process.env.DEV_OTP_BYPASS) return process.env.DEV_OTP_BYPASS
  if (!hasRedis) return '123456'
  return null
}

// ── Error types ───────────────────────────────────────────────────────────

export class OtpError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message)
    this.name = 'OtpError'
  }
}

export class OtpLockedError extends OtpError {
  constructor(public readonly minutesRemaining: number) {
    super(`Too many attempts. Try again in ${minutesRemaining} minutes.`, 'OTP_LOCKED')
  }
}

export class OtpExpiredError extends OtpError {
  constructor() {
    super('OTP expired. Please request a new code.', 'OTP_EXPIRED')
  }
}

export class OtpInvalidError extends OtpError {
  constructor(public readonly attemptsRemaining: number) {
    super(`Incorrect OTP. ${attemptsRemaining} attempts remaining.`, 'OTP_INVALID')
  }
}

export class OtpRateLimitError extends OtpError {
  constructor() {
    super('Too many OTP requests. Please wait before requesting again.', 'OTP_RATE_LIMIT')
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function generateOtp(): string {
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String(100000 + (array[0]! % 900000))
}

async function sendViaMSG91(phone: string, otp: string): Promise<void> {
  const apiKey = process.env.MSG91_API_KEY
  const templateId = process.env.MSG91_TEMPLATE_ID

  if (!apiKey || !templateId) {
    console.log(`[DEV] OTP for +91${phone}: ${otp}`)
    return
  }

  const res = await fetch('https://api.msg91.com/api/v5/otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', authkey: apiKey },
    body: JSON.stringify({
      template_id: templateId,
      mobile: `91${phone}`,
      otp,
    }),
  })

  if (!res.ok) {
    throw new OtpError('Failed to send OTP via SMS', 'OTP_SEND_FAILED')
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Generate a 6-digit OTP and send it to the given phone via MSG91.
 * Returns a nonce to be stored client-side for the verify step.
 *
 * In dev mode without Redis, uses an in-memory store and logs the OTP.
 */
export async function sendOtp(phone: string): Promise<{ nonce: string }> {
  const bypassOtp = getBypassOtp()
  if (bypassOtp !== null) {
    console.log(`[BYPASS] OTP for ${phone}: ${bypassOtp}`)
    return { nonce: 'dev' }
  }

  const lockoutTtl = await redis.ttl(`otp:${phone}:lockout`)
  if (lockoutTtl > 0) {
    throw new OtpLockedError(Math.ceil(lockoutTtl / 60))
  }

  const nonce = crypto.randomUUID()
  const otp = generateOtp()

  await redis.set(`otp:${phone}:${nonce}`, otp, { ex: OTP_TTL_SECONDS })
  await sendViaMSG91(phone, otp)

  return { nonce }
}

/**
 * Verify the OTP for a phone number.
 * Tracks failed attempts; locks phone after MAX_ATTEMPTS failures.
 * Deletes OTP from Redis (or dev store) on success.
 */
export async function verifyOtp(
  phone: string,
  nonce: string,
  code: string
): Promise<true> {
  const bypassOtp = getBypassOtp()
  if (bypassOtp !== null) {
    if (code !== bypassOtp) throw new OtpInvalidError(2)
    return true
  }

  // Check lockout first
  const lockoutTtl = await redis.ttl(`otp:${phone}:lockout`)
  if (lockoutTtl > 0) {
    throw new OtpLockedError(Math.ceil(lockoutTtl / 60))
  }

  // Fetch stored OTP
  const stored = await redis.get<string>(`otp:${phone}:${nonce}`)
  if (!stored) {
    throw new OtpExpiredError()
  }

  if (stored !== code) {
    const attemptsKey = `otp:${phone}:attempts`
    const attempts = await redis.incr(attemptsKey)

    if (attempts === 1) {
      await redis.expire(attemptsKey, OTP_TTL_SECONDS)
    }

    if (attempts >= MAX_ATTEMPTS) {
      await redis.set(`otp:${phone}:lockout`, '1', { ex: LOCKOUT_TTL_SECONDS })
      await redis.del(attemptsKey)
      await redis.del(`otp:${phone}:${nonce}`)
      throw new OtpLockedError(Math.ceil(LOCKOUT_TTL_SECONDS / 60))
    }

    throw new OtpInvalidError(MAX_ATTEMPTS - attempts)
  }

  await redis.del(`otp:${phone}:${nonce}`)
  await redis.del(`otp:${phone}:attempts`)

  return true
}
