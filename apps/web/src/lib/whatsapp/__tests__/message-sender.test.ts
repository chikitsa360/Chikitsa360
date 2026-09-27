import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must use vi.fn() inside the factory (not external variables) due to hoisting
vi.mock('@/lib/notify/transport', () => ({
  resolveTransport: vi.fn(),
}))
vi.mock('@/lib/notify/client', () => ({
  notifySend: vi.fn(),
}))

import { notifySend } from '@/lib/notify/client'
import { resolveTransport } from '@/lib/notify/transport'
import { sendText, sendQuickReply, sendListMessage } from '../message-sender'

const mockResolve = resolveTransport as unknown as ReturnType<typeof vi.fn>
const mockNotifySend = notifySend as unknown as ReturnType<typeof vi.fn>

const PNID = 'pnid-1'
const TO = '919876543210'

describe('message-sender dual transport', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('META_SYSTEM_ACCESS_TOKEN', 'meta-token')
    vi.stubGlobal('fetch', vi.fn())
  })

  describe('direct transport (regression — existing behavior unchanged)', () => {
    beforeEach(() => {
      mockResolve.mockResolvedValue({ mode: 'direct' })
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [{ id: 'wamid.direct' }] }),
      })
    })

    it('sendText posts the exact Meta Cloud API body', async () => {
      const res = await sendText(PNID, TO, 'Hello')
      expect(res).toEqual({ success: true, messageId: 'wamid.direct' })
      expect(mockNotifySend).not.toHaveBeenCalled()

      const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
      expect(url).toBe(`https://graph.facebook.com/v19.0/${PNID}/messages`)
      expect(JSON.parse(init.body as string)).toEqual({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: TO,
        type: 'text',
        text: { preview_url: false, body: 'Hello' },
      })
    })

    it('sendQuickReply posts the exact Meta interactive body', async () => {
      await sendQuickReply(PNID, TO, 'Pick one', [{ id: 'consent_yes', title: 'Yes' }])
      const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
      const body = JSON.parse(init.body as string)
      expect(body.interactive.type).toBe('button')
      expect(body.interactive.action.buttons).toEqual([
        { type: 'reply', reply: { id: 'consent_yes', title: 'Yes' } },
      ])
    })
  })

  describe('notify transport', () => {
    beforeEach(() => {
      mockResolve.mockResolvedValue({ mode: 'notify', apiKey: 'nsk_test' })
      mockNotifySend.mockResolvedValue({ success: true, messageId: 'wamid.notify' })
    })

    it('sendText maps to a Notify text payload', async () => {
      const res = await sendText(PNID, TO, 'Hello')
      expect(res).toEqual({ success: true, messageId: 'wamid.notify' })
      expect(global.fetch).not.toHaveBeenCalled()
      expect(mockNotifySend).toHaveBeenCalledWith('nsk_test', {
        to: TO,
        template: 'text',
        text: 'Hello',
      })
    })

    it('sendQuickReply preserves the exact button ids the state machine routes on', async () => {
      await sendQuickReply(PNID, TO, 'Reminder', [
        { id: 'CANCEL_APPOINTMENT:apt-1', title: 'Cancel appointment please' },
      ])
      expect(mockNotifySend).toHaveBeenCalledWith('nsk_test', {
        to: TO,
        template: 'interactive_buttons',
        text: 'Reminder',
        buttons: [{ id: 'CANCEL_APPOINTMENT:apt-1', title: 'Cancel appointment p' }],
      })
    })

    it('sendListMessage maps rows into a Notify list payload', async () => {
      const rows = [{ id: 'slot:1', title: '10:00 AM', description: 'Dr. A' }]
      await sendListMessage(PNID, TO, 'Slots', 'Pick a slot', 'View slots', rows)
      expect(mockNotifySend).toHaveBeenCalledWith('nsk_test', {
        to: TO,
        template: 'interactive_list',
        list: {
          header: 'Slots',
          body: 'Pick a slot',
          buttonLabel: 'View slots',
          sections: [{ rows }],
        },
      })
    })
  })

  it('returns a failed send on transport misconfiguration (no silent fallback)', async () => {
    mockResolve.mockResolvedValue({ mode: 'error', error: 'no key stored' })
    const res = await sendText(PNID, TO, 'Hello')
    expect(res).toEqual({ success: false, error: 'no key stored' })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(mockNotifySend).not.toHaveBeenCalled()
  })
})
