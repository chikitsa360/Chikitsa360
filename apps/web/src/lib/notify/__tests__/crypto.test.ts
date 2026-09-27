import { describe, it, expect, vi, beforeEach } from 'vitest'

import { encryptNotifySecret, decryptNotifySecret } from '../crypto'

const VALID_KEY = 'a'.repeat(64)

describe('notify crypto', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('NOTIFY_CREDS_KEY', VALID_KEY)
  })

  it('round-trips a secret', () => {
    const stored = encryptNotifySecret('nsk_test_12345')
    expect(stored.startsWith('v1:')).toBe(true)
    expect(decryptNotifySecret(stored)).toBe('nsk_test_12345')
  })

  it('produces a different ciphertext per call (random IV)', () => {
    expect(encryptNotifySecret('same')).not.toBe(encryptNotifySecret('same'))
  })

  it('throws when NOTIFY_CREDS_KEY is missing', () => {
    vi.stubEnv('NOTIFY_CREDS_KEY', '')
    expect(() => encryptNotifySecret('x')).toThrow(/NOTIFY_CREDS_KEY/)
  })

  it('throws when NOTIFY_CREDS_KEY is not 64 hex chars', () => {
    vi.stubEnv('NOTIFY_CREDS_KEY', 'too-short')
    expect(() => encryptNotifySecret('x')).toThrow(/NOTIFY_CREDS_KEY/)
  })

  it('rejects malformed stored values', () => {
    expect(() => decryptNotifySecret('not-encrypted')).toThrow(/Malformed/)
    expect(() => decryptNotifySecret('v2:a:b:c')).toThrow(/Malformed/)
  })

  it('rejects tampered ciphertext (GCM auth)', () => {
    const stored = encryptNotifySecret('nsk_test_12345')
    const parts = stored.split(':')
    const flipped = Buffer.from(parts[3] ?? '', 'base64')
    flipped[0] = (flipped[0] ?? 0) ^ 0xff
    const tampered = `${parts[0]}:${parts[1]}:${parts[2]}:${flipped.toString('base64')}`
    expect(() => decryptNotifySecret(tampered)).toThrow()
  })

  it('rejects decryption under a different key', () => {
    const stored = encryptNotifySecret('nsk_test_12345')
    vi.stubEnv('NOTIFY_CREDS_KEY', 'b'.repeat(64))
    expect(() => decryptNotifySecret(stored)).toThrow()
  })
})
