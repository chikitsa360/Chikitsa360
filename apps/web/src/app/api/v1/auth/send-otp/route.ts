import { NextRequest } from 'next/server'
import { sendOtpSchema } from '@chikitsa360/core'
import { sendOtp, OtpLockedError, OtpError } from '@/lib/otp'
import { apiSuccess, apiError, HTTP } from '@/app/api/v1/_lib/response'
import { otpRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) return apiError('INVALID_BODY', 'Request body is required', HTTP.BAD_REQUEST)

  const parsed = sendOtpSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Invalid phone number', HTTP.BAD_REQUEST, parsed.error.issues)
  }

  const { phone } = parsed.data

  // Rate limit: max 3 OTP requests per phone per 10 minutes
  const { success, reset } = await otpRateLimit.limit(phone)
  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000)
    return new Response(
      JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Too many OTP requests' } }),
      {
        status: HTTP.TOO_MANY_REQUESTS,
        headers: { 'Retry-After': String(retryAfter), 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const { nonce } = await sendOtp(phone)
    return apiSuccess({ nonce, last4: phone.slice(-4) }, HTTP.OK)
  } catch (err: unknown) {
    if (err instanceof OtpLockedError) {
      return apiError('OTP_LOCKED', err.message, HTTP.TOO_MANY_REQUESTS)
    }
    if (err instanceof OtpError) {
      return apiError(err.code, err.message, HTTP.BAD_REQUEST)
    }
    console.error('[send-otp] Unexpected error:', err)
    return apiError('INTERNAL_ERROR', 'Failed to send OTP', HTTP.INTERNAL_ERROR)
  }
}
