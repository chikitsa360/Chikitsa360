import Pusher from 'pusher'
import PusherJs from 'pusher-js'

// Server-side Pusher instance — lazy, only created when env vars are present
let _pusherServer: Pusher | null = null

export function getPusherServer(): Pusher | null {
  if (!process.env.PUSHER_APP_ID || !process.env.PUSHER_KEY || !process.env.PUSHER_SECRET) {
    return null
  }
  if (!_pusherServer) {
    _pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER ?? 'ap2',
      useTLS: true,
    })
  }
  return _pusherServer
}

// Keep backward-compat export for existing route callers
export const pusherServer = new Proxy({} as Pusher, {
  get(_target, prop) {
    const instance = getPusherServer()
    if (!instance) return () => Promise.resolve()
    return (instance as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// Client-side Pusher factory — returns null when key not configured (dev without Pusher)
export function createPusherClient(): PusherJs | null {
  if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return null
  return new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'ap2',
  })
}

export function clinicChannel(clinicId: string): string {
  return `clinic-${clinicId}`
}
