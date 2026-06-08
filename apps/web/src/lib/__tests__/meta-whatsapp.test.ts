import { describe, it, expect } from 'vitest'
import { createHmac } from 'crypto'
import { validateWebhookSignature } from '../meta-whatsapp'

const APP_SECRET = 'test-app-secret-1234'

function makeSignature(body: string, secret = APP_SECRET): string {
  const hex = createHmac('sha256', secret).update(body).digest('hex')
  return `sha256=${hex}`
}

function currentTimestamp(): string {
  return String(Math.floor(Date.now() / 1000))
}

describe('validateWebhookSignature', () => {
  it('returns true for a valid signature', () => {
    const body = JSON.stringify({ test: 'payload' })
    const sig = makeSignature(body)
    expect(validateWebhookSignature(body, sig, APP_SECRET)).toBe(true)
  })

  it('returns false for a tampered body', () => {
    const body = JSON.stringify({ test: 'payload' })
    const sig = makeSignature(body)
    const tampered = JSON.stringify({ test: 'TAMPERED' })
    expect(validateWebhookSignature(tampered, sig, APP_SECRET)).toBe(false)
  })

  it('returns false for a wrong secret', () => {
    const body = JSON.stringify({ test: 'payload' })
    const sig = makeSignature(body, 'different-secret')
    expect(validateWebhookSignature(body, sig, APP_SECRET)).toBe(false)
  })

  it('returns false when signature header is missing prefix', () => {
    const body = JSON.stringify({ test: 'payload' })
    const hex = createHmac('sha256', APP_SECRET).update(body).digest('hex')
    expect(validateWebhookSignature(body, hex, APP_SECRET)).toBe(false)
  })

  it('returns true with a valid timestamp', () => {
    const body = 'test-body'
    const sig = makeSignature(body)
    const ts = currentTimestamp()
    expect(validateWebhookSignature(body, sig, APP_SECRET, ts)).toBe(true)
  })

  it('returns false for a timestamp older than 5 minutes', () => {
    const body = 'test-body'
    const sig = makeSignature(body)
    const oldTs = String(Math.floor(Date.now() / 1000) - 301)
    expect(validateWebhookSignature(body, sig, APP_SECRET, oldTs)).toBe(false)
  })

  it('returns false for an invalid timestamp', () => {
    const body = 'test-body'
    const sig = makeSignature(body)
    expect(validateWebhookSignature(body, sig, APP_SECRET, 'not-a-number')).toBe(false)
  })

  it('returns false for mismatched hex lengths', () => {
    const body = 'test-body'
    // Provide a truncated hex (odd length / wrong length)
    expect(validateWebhookSignature(body, 'sha256=abc', APP_SECRET)).toBe(false)
  })

  it('handles empty body correctly', () => {
    const body = ''
    const sig = makeSignature(body)
    expect(validateWebhookSignature(body, sig, APP_SECRET)).toBe(true)
  })
})
