'use client'

import * as React from 'react'
import { createPusherClient, clinicChannel } from '@/lib/pusher'

interface AppointmentUpdateCallbacks {
  onAppointmentCreated?: () => void
  onAppointmentUpdated?: () => void
  onAppointmentCancelled?: () => void
  onSlotBlocked?: () => void
  onSlotUnblocked?: () => void
}

/**
 * Subscribes to Pusher clinic channel for real-time appointment events.
 * Implements the 4-layer reliability pattern (Story 5.1):
 * - Layer 1: Pusher events → callback triggers
 * - Layer 2: Reconnect → callbacks triggered
 * - Layer 3: 10s polling fallback when Pusher is disconnected
 * - Layer 4: Optimistic UI handled by callers
 */
export function useAppointmentUpdates(
  clinicId: string,
  callbacks: AppointmentUpdateCallbacks
): { pusherConnected: boolean } {
  const [pusherConnected, setPusherConnected] = React.useState(true)
  const callbacksRef = React.useRef(callbacks)
  callbacksRef.current = callbacks

  // 10s polling fallback when Pusher is disconnected
  React.useEffect(() => {
    if (pusherConnected) return
    const interval = setInterval(() => {
      callbacksRef.current.onAppointmentCreated?.()
    }, 10_000)
    return () => clearInterval(interval)
  }, [pusherConnected])

  React.useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    const pusher = createPusherClient()
    const channel = pusher.subscribe(clinicChannel(clinicId))

    channel.bind('appointment.created', () => {
      callbacksRef.current.onAppointmentCreated?.()
    })
    channel.bind('appointment.updated', () => {
      callbacksRef.current.onAppointmentUpdated?.()
    })
    channel.bind('appointment.cancelled', () => {
      callbacksRef.current.onAppointmentCancelled?.()
    })
    channel.bind('slot.blocked', () => {
      callbacksRef.current.onSlotBlocked?.()
    })
    channel.bind('slot.unblocked', () => {
      callbacksRef.current.onSlotUnblocked?.()
    })

    // Track connection state
    pusher.connection.bind('connected', () => setPusherConnected(true))
    pusher.connection.bind('disconnected', () => setPusherConnected(false))
    pusher.connection.bind('unavailable', () => setPusherConnected(false))

    // On reconnect: full cache invalidation (trigger all callbacks)
    pusher.connection.bind('connected', () => {
      callbacksRef.current.onAppointmentCreated?.()
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(clinicChannel(clinicId))
      pusher.disconnect()
    }
  }, [clinicId])

  return { pusherConnected }
}
