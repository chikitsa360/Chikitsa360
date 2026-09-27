import { createHmac } from 'crypto'

import { describe, it, expect } from 'vitest'

import { verifyNotifySignature, translateToInngestEvent } from '../webhook'

const SECRET = 'whsec_test'

function sign(body: string, timestamp: number, secret = SECRET): string {
  const hmac = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return `t=${timestamp},v1=${hmac}`
}

describe('verifyNotifySignature', () => {
  const now = 1_700_000_000
  const body = JSON.stringify({ event: 'reply', data: {} })

  it('accepts a valid signature', () => {
    expect(verifyNotifySignature(body, sign(body, now), SECRET, now)).toBe(true)
  })

  it('rejects a stale timestamp (> 5 min)', () => {
    expect(verifyNotifySignature(body, sign(body, now - 301), SECRET, now)).toBe(false)
  })

  it('accepts a timestamp within the replay window', () => {
    expect(verifyNotifySignature(body, sign(body, now - 299), SECRET, now)).toBe(true)
  })

  it('rejects the wrong secret', () => {
    expect(verifyNotifySignature(body, sign(body, now, 'other'), SECRET, now)).toBe(false)
  })

  it('rejects a tampered body', () => {
    expect(verifyNotifySignature(body + 'x', sign(body, now), SECRET, now)).toBe(false)
  })

  it('rejects malformed headers', () => {
    expect(verifyNotifySignature(body, '', SECRET, now)).toBe(false)
    expect(verifyNotifySignature(body, 'v1=abc', SECRET, now)).toBe(false)
    expect(verifyNotifySignature(body, 't=123', SECRET, now)).toBe(false)
    expect(verifyNotifySignature(body, 't=abc,v1=def', SECRET, now)).toBe(false)
  })
})

describe('translateToInngestEvent', () => {
  const PHONE_NUMBER_ID = 'pnid-123'

  it('translates a text reply into whatsapp/message.received', () => {
    const ev = translateToInngestEvent(
      'reply',
      { from: '919876543210', messageId: 'wamid.abc', type: 'text', text: 'Hi', rawPayload: { timestamp: '1700000000' } },
      PHONE_NUMBER_ID
    )
    expect(ev).toEqual({
      id: 'wamid.abc',
      name: 'whatsapp/message.received',
      data: {
        messageId: 'wamid.abc',
        phoneNumberId: PHONE_NUMBER_ID,
        patientPhone: '919876543210',
        messageType: 'text',
        messageBody: 'Hi',
        interactiveType: null,
        interactiveId: null,
        interactiveTitle: null,
        timestamp: '1700000000',
      },
    })
  })

  it('translates a button reply with the original id intact', () => {
    const ev = translateToInngestEvent(
      'reply',
      {
        from: '919876543210',
        messageId: 'wamid.btn',
        type: 'button',
        buttonId: 'CANCEL_APPOINTMENT:apt-1',
        buttonTitle: 'Cancel',
      },
      PHONE_NUMBER_ID
    )
    expect(ev?.data.messageType).toBe('interactive')
    expect(ev?.data.interactiveType).toBe('button_reply')
    expect(ev?.data.interactiveId).toBe('CANCEL_APPOINTMENT:apt-1')
    expect(ev?.data.interactiveTitle).toBe('Cancel')
  })

  it('translates a list-row reply (slot pick)', () => {
    const ev = translateToInngestEvent(
      'reply',
      {
        from: '919876543210',
        messageId: 'wamid.list',
        type: 'list',
        listRowId: 'slot:2026-09-28:10:00:doc-1',
        listRowTitle: '10:00 AM',
      },
      PHONE_NUMBER_ID
    )
    expect(ev?.data.messageType).toBe('interactive')
    expect(ev?.data.interactiveType).toBe('list_reply')
    expect(ev?.data.interactiveId).toBe('slot:2026-09-28:10:00:doc-1')
  })

  it('translates status events into whatsapp/status.update with the wamid', () => {
    for (const status of ['sent', 'delivered', 'read', 'failed']) {
      const ev = translateToInngestEvent(
        status,
        { id: 'evt-1', to: '919876543210', waMessageId: 'wamid.out', status },
        PHONE_NUMBER_ID
      )
      expect(ev).toEqual({
        id: `wamid.out:${status}`,
        name: 'whatsapp/status.update',
        data: {
          messageId: 'wamid.out',
          recipientId: '919876543210',
          status,
          timestamp: expect.any(String),
        },
      })
    }
  })

  it('falls back to the event id when no wamid exists', () => {
    const ev = translateToInngestEvent('failed', { id: 'evt-2', to: '91987' }, PHONE_NUMBER_ID)
    expect(ev?.data.messageId).toBe('evt-2')
  })

  it('returns null for unknown events, missing data, or incomplete replies', () => {
    expect(translateToInngestEvent('something-else', { id: 'x' }, PHONE_NUMBER_ID)).toBeNull()
    expect(translateToInngestEvent('reply', undefined, PHONE_NUMBER_ID)).toBeNull()
    expect(translateToInngestEvent('reply', { messageId: 'wamid.x' }, PHONE_NUMBER_ID)).toBeNull()
    expect(translateToInngestEvent('failed', {}, PHONE_NUMBER_ID)).toBeNull()
  })
})
