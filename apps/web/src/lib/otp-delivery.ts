import { sendTemplateMessage } from './meta-whatsapp'

/**
 * Login OTP delivery — cheapest channel first.
 *
 * 1. WhatsApp authentication template (~₹0.12/msg in India) from the platform's
 *    own number. Needs OTP_WHATSAPP_PHONE_NUMBER_ID + META_SYSTEM_ACCESS_TOKEN
 *    and a Meta-approved AUTHENTICATION template (default name: login_otp —
 *    body “{{1}} is your verification code” + copy-code button).
 * 2. MSG91 SMS (~₹0.20/msg, DLT template) when WhatsApp is unconfigured or the
 *    send fails (user without WhatsApp, template issues, etc.).
 * 3. Neither configured → log the code (local dev behaviour, unchanged).
 *
 * Returns the channel used; throws only when a configured channel chain fails.
 * Env vars are read inside the functions (vi.stubEnv testability convention).
 */

export type OtpChannel = 'whatsapp' | 'sms' | 'dev'

async function sendViaWhatsApp(phone: string, otp: string): Promise<boolean> {
  const phoneNumberId = process.env.OTP_WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.META_SYSTEM_ACCESS_TOKEN
  if (!phoneNumberId || !accessToken) return false

  const templateName = process.env.OTP_WHATSAPP_TEMPLATE ?? 'login_otp'
  const languageCode = process.env.OTP_WHATSAPP_TEMPLATE_LANG ?? 'en'

  // Meta AUTHENTICATION templates require the code in the body AND in the
  // copy-code URL button — both components are mandatory.
  const result = await sendTemplateMessage(
    phoneNumberId,
    `91${phone}`,
    templateName,
    languageCode,
    [
      { type: 'body', parameters: [{ type: 'text', text: otp }] },
      { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: otp }] },
    ],
    accessToken
  )

  if (!result.success) {
    console.warn(`[otp] WhatsApp send failed (falling back to SMS): ${result.error}`)
  }
  return result.success
}

async function sendViaSms(phone: string, otp: string): Promise<boolean> {
  const apiKey = process.env.MSG91_API_KEY
  const templateId = process.env.MSG91_TEMPLATE_ID
  if (!apiKey || !templateId) return false

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
    console.warn(`[otp] MSG91 send failed: HTTP ${res.status}`)
  }
  return res.ok
}

/**
 * Delivers a login OTP: WhatsApp → SMS → dev log.
 * Throws when at least one channel is configured but every configured channel failed.
 */
export async function sendLoginOtp(phone: string, otp: string): Promise<OtpChannel> {
  const whatsappConfigured = !!(
    process.env.OTP_WHATSAPP_PHONE_NUMBER_ID && process.env.META_SYSTEM_ACCESS_TOKEN
  )
  const smsConfigured = !!(process.env.MSG91_API_KEY && process.env.MSG91_TEMPLATE_ID)

  if (!whatsappConfigured && !smsConfigured) {
    console.log(`[DEV] OTP for +91${phone}: ${otp}`)
    return 'dev'
  }

  if (whatsappConfigured && (await sendViaWhatsApp(phone, otp))) return 'whatsapp'
  if (smsConfigured && (await sendViaSms(phone, otp))) return 'sms'

  throw new Error('All configured OTP channels failed')
}
