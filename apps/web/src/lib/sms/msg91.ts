/**
 * MSG91 transactional SMS client.
 * Docs: https://msg91.com/help/MSG91/what-is-transactional-sms
 */

const MSG91_API_URL = 'https://api.msg91.com/api/sendotp.php'

export interface SmsSendResult {
  success: boolean
  error?: string
}

/**
 * Sends a plain-text transactional SMS via MSG91.
 * Content must be under 160 characters (single SMS unit).
 */
export async function sendSms(
  to: string,
  message: string
): Promise<SmsSendResult> {
  const authKey = process.env.MSG91_AUTH_KEY
  const senderId = process.env.MSG91_SENDER_ID ?? 'CLNQLY'
  const templateId = process.env.MSG91_TEMPLATE_ID

  if (!authKey) {
    return { success: false, error: 'MSG91_AUTH_KEY not configured' }
  }

  // Strip leading '+' from E.164 format for MSG91
  const mobile = to.replace(/^\+/, '')

  const params = new URLSearchParams({
    authkey: authKey,
    mobile,
    message: message.slice(0, 160),
    sender: senderId,
    route: '4', // Transactional route
    ...(templateId ? { template_id: templateId } : {}),
  })

  try {
    const res = await fetch(`${MSG91_API_URL}?${params.toString()}`, { method: 'GET' })
    const text = await res.text()

    if (!res.ok || text.toLowerCase().includes('error')) {
      return { success: false, error: text }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}
