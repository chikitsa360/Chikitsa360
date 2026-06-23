'use client'

import { usePushNotifications } from '@/hooks/usePushNotifications'

/**
 * Mount-only client component that registers push notifications.
 * Renders nothing — side-effect only.
 */
export function PushNotificationsClient() {
  usePushNotifications()
  return null
}
