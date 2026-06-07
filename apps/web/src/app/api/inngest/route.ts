import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'

// Register Inngest functions here as you add them
const functions: Parameters<typeof serve>[0]['functions'] = []

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
