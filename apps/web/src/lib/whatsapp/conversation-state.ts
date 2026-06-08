import { redis } from '@/lib/redis'

export type ConversationStep =
  | 'AWAITING_CONSENT'
  | 'AWAITING_NAME'
  | 'AWAITING_AGE'
  | 'AWAITING_GENDER'
  | 'AWAITING_SLOT'

export interface ConversationState {
  step: ConversationStep
  clinicId: string
  patientPhone: string
  collectedFields: {
    name?: string
    ageRange?: string
    gender?: string
  }
  reservedSlotId?: string
  reservationJobId?: string
  language: 'en' | 'hi'
  consentGiven: boolean
  nameAttempts?: number
  createdAt: string
  updatedAt: string
}

const TTL_SECONDS = 1800 // 30 minutes

export function conversationKey(clinicId: string, patientPhone: string): string {
  return `${clinicId}:${patientPhone}:conversation`
}

export async function getConversationState(
  clinicId: string,
  patientPhone: string
): Promise<ConversationState | null> {
  const key = conversationKey(clinicId, patientPhone)
  return redis.get<ConversationState>(key)
}

export async function setConversationState(
  clinicId: string,
  patientPhone: string,
  state: Omit<ConversationState, 'updatedAt'>
): Promise<void> {
  const key = conversationKey(clinicId, patientPhone)
  const fullState: ConversationState = { ...state, updatedAt: new Date().toISOString() }
  await redis.set(key, fullState, { ex: TTL_SECONDS })
}

export async function deleteConversationState(
  clinicId: string,
  patientPhone: string
): Promise<void> {
  await redis.del(conversationKey(clinicId, patientPhone))
}

export function createInitialState(
  clinicId: string,
  patientPhone: string,
  language: 'en' | 'hi' = 'en'
): Omit<ConversationState, 'updatedAt'> {
  const now = new Date().toISOString()
  return {
    step: 'AWAITING_CONSENT',
    clinicId,
    patientPhone,
    collectedFields: {},
    language,
    consentGiven: false,
    createdAt: now,
  }
}
