import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createHmac } from 'crypto'

// Mock inngest
vi.mock('@/lib/inngest', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))

import { inngest } from '@/lib/inngest'
import { GET, POST } from '../../webhooks/whatsapp/route'
import { NextRequest } from 'next/server'

const mockInngest = inngest as unknown as { send: ReturnType<typeof vi.fn> }
const APP_SECRET = 'test-secret'
const VERIFY_TOKEN = 'test-verify-token'

function makeSignature(body: string, secret = APP_SECRET): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

function currentTs(): string {
  return String(Math.floor(Date.now() / 1000))
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('META_APP_SECRET', APP_SECRET)
  vi.stubEnv('WHATSAPP_VERIFY_TOKEN', VERIFY_TOKEN)
})

describe('GET /api/webhooks/whatsapp - verification challenge', () => {
  it('responds with hub.challenge for valid verify_token', async () => {
    const req = new NextRequest(
      `http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=abc123`
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.text()
    expect(body).toBe('abc123')
  })

  it('returns 403 for invalid verify_token', async () => {
    const req = new NextRequest(
      `http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=abc123`
    )
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('returns 403 when mode is not subscribe', async () => {
    const req = new NextRequest(
      `http://localhost/api/webhooks/whatsapp?hub.mode=unsubscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=abc123`
    )
    const res = await GET(req)
    expect(res.status).toBe(403)
  })
})

describe('POST /api/webhooks/whatsapp - inbound messages', () => {
  it('returns 200 and dispatches Inngest job with messageId idempotency key', async () => {
    const body = JSON.stringify({
      entry: [{
        changes: [{
          field: 'messages',
          value: {
            metadata: { phone_number_id: 'phone_123' },
            messages: [{ id: 'wamid.abc123', from: '+919876543210', type: 'text', text: { body: 'Hi' }, timestamp: '1234567890' }],
          },
        }],
      }],
    })
    const sig = makeSignature(body)
    const req = new NextRequest('http://localhost/api/webhooks/whatsapp', {
      method: 'POST',
      body,
      headers: {
        'x-hub-signature-256': sig,
        'x-hub-timestamp': currentTs(),
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockInngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'wamid.abc123',
        name: 'whatsapp/message.received',
        data: expect.objectContaining({
          messageId: 'wamid.abc123',
          phoneNumberId: 'phone_123',
          patientPhone: '+919876543210',
          messageBody: 'Hi',
        }),
      })
    )
  })

  it('dispatches whatsapp/status.update for delivery status webhooks', async () => {
    const body = JSON.stringify({
      entry: [{
        changes: [{
          field: 'messages',
          value: {
            metadata: { phone_number_id: 'phone_123' },
            statuses: [{ id: 'wamid.xyz', recipient_id: '+919876543210', status: 'delivered', timestamp: '1234567890' }],
          },
        }],
      }],
    })
    const sig = makeSignature(body)
    const req = new NextRequest('http://localhost/api/webhooks/whatsapp', {
      method: 'POST',
      body,
      headers: { 'x-hub-signature-256': sig, 'x-hub-timestamp': currentTs() },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockInngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'wamid.xyz:delivered',
        name: 'whatsapp/status.update',
      })
    )
  })

  it('returns 403 and does NOT dispatch job for invalid signature', async () => {
    const body = JSON.stringify({ entry: [{ id: 'test' }] })
    const req = new NextRequest('http://localhost/api/webhooks/whatsapp', {
      method: 'POST',
      body,
      headers: {
        'x-hub-signature-256': 'sha256=invalidsignature',
        'x-hub-timestamp': currentTs(),
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    expect(mockInngest.send).not.toHaveBeenCalled()
  })

  it('returns 403 for tampered body', async () => {
    const originalBody = JSON.stringify({ entry: [{ id: 'original' }] })
    const sig = makeSignature(originalBody)
    const tamperedBody = JSON.stringify({ entry: [{ id: 'tampered' }] })

    const req = new NextRequest('http://localhost/api/webhooks/whatsapp', {
      method: 'POST',
      body: tamperedBody,
      headers: {
        'x-hub-signature-256': sig,
        'x-hub-timestamp': currentTs(),
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    expect(mockInngest.send).not.toHaveBeenCalled()
  })

  it('returns 403 for replay attack (timestamp > 5 min old)', async () => {
    const body = JSON.stringify({ entry: [] })
    const sig = makeSignature(body)
    const oldTs = String(Math.floor(Date.now() / 1000) - 400) // 400s ago > 5min

    const req = new NextRequest('http://localhost/api/webhooks/whatsapp', {
      method: 'POST',
      body,
      headers: { 'x-hub-signature-256': sig, 'x-hub-timestamp': oldTs },
    })

    const res = await POST(req)
    expect(res.status).toBe(403)
    expect(mockInngest.send).not.toHaveBeenCalled()
  })

  it('returns 200 even if payload has no messages (no inngest call)', async () => {
    const body = JSON.stringify({ entry: [{ changes: [] }] })
    const sig = makeSignature(body)
    const req = new NextRequest('http://localhost/api/webhooks/whatsapp', {
      method: 'POST',
      body,
      headers: { 'x-hub-signature-256': sig, 'x-hub-timestamp': currentTs() },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
