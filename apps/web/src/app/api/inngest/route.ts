import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest'
import { whatsappMessageReceived } from '@/inngest/functions/whatsapp-message-received'
import { whatsappSlotRelease } from '@/inngest/functions/whatsapp-slot-release'
import { whatsappStatusUpdate } from '@/inngest/functions/whatsapp-status-update'
import { appointmentConfirmationSend } from '@/inngest/functions/appointment-confirmation-send'
import { appointmentSmsFallback } from '@/inngest/functions/appointment-sms-fallback'
import { appointmentCancellationSend } from '@/inngest/functions/appointment-cancellation-send'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    whatsappMessageReceived,
    whatsappSlotRelease,
    whatsappStatusUpdate,
    appointmentConfirmationSend,
    appointmentSmsFallback,
    appointmentCancellationSend,
  ],
})
