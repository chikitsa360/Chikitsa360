'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'

/**
 * Registers the service worker and subscribes the current staff user
 * to web push notifications. Called once on dashboard mount.
 *
 * - Requests browser notification permission (one-time browser prompt)
 * - Subscribes using VAPID public key
 * - POSTs subscription to /api/v1/push/subscribe
 * - Silent no-op if VAPID key not set, browser unsupported, or permission denied
 */
export function usePushNotifications() {
  const { data: session } = useSession()

  useEffect(() => {
    if (!session?.user?.clinicId) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) return // not configured

    async function subscribe() {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return

      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready

      // Check if already subscribed with valid endpoint
      const existing = await registration.pushManager.getSubscription()
      if (existing) {
        // Re-save in case the user logged out and back in on a new session
        await fetch('/api/v1/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(existing.toJSON()),
        }).catch(() => {})
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey!) as unknown as BufferSource,
      })

      await fetch('/api/v1/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      }).catch(() => {})
    }

    subscribe().catch((err) => {
      console.warn('[push] subscription failed:', err)
    })
  }, [session?.user?.id]) // re-run only when user changes
}

// Convert VAPID base64 public key to Uint8Array for pushManager.subscribe
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i)
  }
  return output
}
