import { redis } from './redis'

const OTP_TTL_SECONDS = 600 // 10 minutes
const MAX_ATTEMPTS = 3
const LOCKOUT_TTL_SECONDS = 900 // 15 minutes

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
  // Cryptographically random 6-digit OTP
  const array = new Uint32Array(1)
  crypto.getRandomValues(array)
  return String(100000 + (array[0]! % 900000))
}

async function sendViaMSG91(phone: string, otp: string): Promise<void> {
  const apiKey = process.env.MSG91_API_KEY
  const templateId = process.env.MSG91_TEMPLATE_ID

  if (!apiKey || !templateId) {
    // Development mode: log OTP instead of sending
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
 * OTP is NOT stored in the database — only in Redis with TTL (security).
 */
export async function sendOtp(phone: string): Promise<{ nonce: string }> {
  // Check if phone is locked
  const lockoutTtl = await redis.ttl(`otp:${phone}:lockout`)
  if (lockoutTtl > 0) {
    throw new OtpLockedError(Math.ceil(lockoutTtl / 60))
  }

  const nonce = crypto.randomUUID()
  const otp = generateOtp()

  // Store OTP in Redis: key includes nonce to prevent cross-session reuse
  await redis.set(`otp:${phone}:${nonce}`, otp, { ex: OTP_TTL_SECONDS })

  await sendViaMSG91(phone, otp)

  return { nonce }
}

/**
 * Verify the OTP for a phone number.
 * Tracks failed attempts; locks phone after MAX_ATTEMPTS failures.
 * Deletes OTP from Redis on success.
 * Throws typed OtpError on failure.
 */
export async function verifyOtp(
  phone: string,
  nonce: string,
  code: string
): Promise<true> {
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

  // Dev bypass: accept a fixed code without Redis (never active in production)
  const devBypass = process.env.NODE_ENV !== 'production' ? process.env.DEV_OTP_BYPASS : undefined
  if (devBypass && code === devBypass) {
    await redis.del(`otp:${phone}:${nonce}`)
    await redis.del(`otp:${phone}:attempts`)
    return true
  }

  // Verify
  if (stored !== code) {
    // Increment failed attempts
    const attemptsKey = `otp:${phone}:attempts`
    const attempts = await redis.incr(attemptsKey)

    // Set TTL on first attempt
    if (attempts === 1) {
      await redis.expire(attemptsKey, OTP_TTL_SECONDS)
    }

    if (attempts >= MAX_ATTEMPTS) {
      // Lock the phone number
      await redis.set(`otp:${phone}:lockout`, '1', { ex: LOCKOUT_TTL_SECONDS })
      await redis.del(attemptsKey)
      await redis.del(`otp:${phone}:${nonce}`)
      throw new OtpLockedError(Math.ceil(LOCKOUT_TTL_SECONDS / 60))
    }

    throw new OtpInvalidError(MAX_ATTEMPTS - attempts)
  }

  // Success — clean up
  await redis.del(`otp:${phone}:${nonce}`)
  await redis.del(`otp:${phone}:attempts`)

  return true
}
