import Pusher from 'pusher'
import PusherJs from 'pusher-js'

// Server-side Pusher instance
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER ?? 'ap2',
  useTLS: true,
})

// Client-side Pusher factory — call in client components
export function createPusherClient(): PusherJs {
  return new PusherJs(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'ap2',
  })
}

export function clinicChannel(clinicId: string): string {
  return `clinic-${clinicId}`
}
