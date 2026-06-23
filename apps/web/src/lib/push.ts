import webpush from 'web-push'
import { db } from './db'

let vapidConfigured = false

function ensureVapid() {
  if (vapidConfigured) return
  const publicKey = process.env.VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const email = process.env.VAPID_EMAIL ?? 'mailto:support@cliniqly.com'
  if (!publicKey || !privateKey) return
  webpush.setVapidDetails(email, publicKey, privateKey)
  vapidConfigured = true
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

/**
 * Send a web push notification to all subscribed staff of a clinic.
 * Automatically removes expired/invalid subscriptions (410 Gone).
 * Non-fatal: logs warnings but never throws.
 */
export async function sendPushToClinicStaff(
  clinicId: string,
  payload: PushPayload
): Promise<void> {
  try {
    ensureVapid()
    if (!vapidConfigured) return // VAPID not set up — skip silently

    const subs = await db.pushSubscription.findMany({ where: { clinicId } })
    if (subs.length === 0) return

    const results = await Promise.allSettled(
      subs.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
      )
    )

    // Clean up expired subscriptions (browser unsubscribed)
    const expiredEndpoints = subs
      .filter((_, i) => {
        const r = results[i]
        return (
          r?.status === 'rejected' &&
          (r.reason as { statusCode?: number })?.statusCode === 410
        )
      })
      .map((s) => s.endpoint)

    if (expiredEndpoints.length > 0) {
      await db.pushSubscription.deleteMany({
        where: { endpoint: { in: expiredEndpoints } },
      })
    }
  } catch (err) {
    console.warn('[push] sendPushToClinicStaff failed:', err)
  }
}
