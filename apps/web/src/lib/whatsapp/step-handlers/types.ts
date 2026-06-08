/**
 * Shared type definitions for WhatsApp step handlers.
 */

export interface ClinicContext {
  id: string
  name: string
  phoneNumberId: string
  language: 'en' | 'hi'
  clinicPhone: string | null
  address: string | null
  trialEndsAt: Date | null
  whatsappConnected: boolean
}

export interface MessageInput {
  messageType: string | null
  messageBody: string | null
  interactiveType: string | null
  interactiveId: string | null
  interactiveTitle: string | null
}
