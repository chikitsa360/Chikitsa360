import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'chikitsa360',
  name: 'Chikitsa360',
})

// Re-export for convenience
export type { GetEvents } from 'inngest'
