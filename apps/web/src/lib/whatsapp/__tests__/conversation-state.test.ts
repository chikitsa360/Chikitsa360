import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must use vi.fn() inside the factory (not external variables) due to hoisting
vi.mock('@/lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}))

import { redis } from '@/lib/redis'
import {
  getConversationState,
  setConversationState,
  deleteConversationState,
  createInitialState,
  conversationKey,
} from '../conversation-state'

const mockGet = redis.get as ReturnType<typeof vi.fn>
const mockSet = redis.set as ReturnType<typeof vi.fn>
const mockDel = redis.del as ReturnType<typeof vi.fn>

const CLINIC_ID = 'clinic-123'
const PATIENT_PHONE = '+919876543210'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('conversationKey', () => {
  it('returns expected Redis key format', () => {
    expect(conversationKey(CLINIC_ID, PATIENT_PHONE)).toBe(
      `${CLINIC_ID}:${PATIENT_PHONE}:conversation`
    )
  })
})

describe('createInitialState', () => {
  it('creates state with AWAITING_CONSENT step', () => {
    const state = createInitialState(CLINIC_ID, PATIENT_PHONE)
    expect(state.step).toBe('AWAITING_CONSENT')
    expect(state.consentGiven).toBe(false)
    expect(state.language).toBe('en')
    expect(state.collectedFields).toEqual({})
  })

  it('uses provided language', () => {
    const state = createInitialState(CLINIC_ID, PATIENT_PHONE, 'hi')
    expect(state.language).toBe('hi')
  })
})

describe('getConversationState', () => {
  it('returns state when Redis has value', async () => {
    const mockState = { ...createInitialState(CLINIC_ID, PATIENT_PHONE), updatedAt: '' }
    mockGet.mockResolvedValueOnce(mockState)
    const result = await getConversationState(CLINIC_ID, PATIENT_PHONE)
    expect(result).toEqual(mockState)
    expect(mockGet).toHaveBeenCalledWith(`${CLINIC_ID}:${PATIENT_PHONE}:conversation`)
  })

  it('returns null when key does not exist', async () => {
    mockGet.mockResolvedValueOnce(null)
    const result = await getConversationState(CLINIC_ID, PATIENT_PHONE)
    expect(result).toBeNull()
  })
})

describe('setConversationState', () => {
  it('sets state with 30-minute TTL and updatedAt timestamp', async () => {
    mockSet.mockResolvedValueOnce('OK')
    const state = createInitialState(CLINIC_ID, PATIENT_PHONE)
    await setConversationState(CLINIC_ID, PATIENT_PHONE, state)

    expect(mockSet).toHaveBeenCalledWith(
      `${CLINIC_ID}:${PATIENT_PHONE}:conversation`,
      expect.objectContaining({ updatedAt: expect.any(String) }),
      { ex: 1800 }
    )
  })
})

describe('deleteConversationState', () => {
  it('deletes the Redis key', async () => {
    mockDel.mockResolvedValueOnce(1)
    await deleteConversationState(CLINIC_ID, PATIENT_PHONE)
    expect(mockDel).toHaveBeenCalledWith(`${CLINIC_ID}:${PATIENT_PHONE}:conversation`)
  })
})
