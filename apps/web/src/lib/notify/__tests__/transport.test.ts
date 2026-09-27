import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must use vi.fn() inside the factory (not external variables) due to hoisting
vi.mock('@/lib/db', () => ({
  db: {
    clinic: {
      findFirst: vi.fn(),
    },
  },
}))

import { db } from '@/lib/db'
import { encryptNotifySecret } from '../crypto'
import { resolveTransport, clearTransportCache } from '../transport'

const mockFindFirst = db.clinic.findFirst as unknown as ReturnType<typeof vi.fn>

const VALID_KEY = 'c'.repeat(64)

describe('resolveTransport', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('NOTIFY_CREDS_KEY', VALID_KEY)
    clearTransportCache()
  })

  it('returns direct for an empty phoneNumberId without touching the DB', async () => {
    expect(await resolveTransport('')).toEqual({ mode: 'direct' })
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it('returns direct when no clinic matches (unknown phone number id)', async () => {
    mockFindFirst.mockResolvedValueOnce(null)
    expect(await resolveTransport('pnid-unknown')).toEqual({ mode: 'direct' })
  })

  it('returns direct for clinics on the direct transport (existing behavior)', async () => {
    mockFindFirst.mockResolvedValueOnce({ whatsappTransport: 'direct', notifyApiKeyEncrypted: null })
    expect(await resolveTransport('pnid-1')).toEqual({ mode: 'direct' })
  })

  it('returns notify with the decrypted API key', async () => {
    mockFindFirst.mockResolvedValueOnce({
      whatsappTransport: 'notify',
      notifyApiKeyEncrypted: encryptNotifySecret('nsk_live_abc'),
    })
    expect(await resolveTransport('pnid-2')).toEqual({ mode: 'notify', apiKey: 'nsk_live_abc' })
  })

  it('returns error (never silent direct fallback) when notify clinic has no key', async () => {
    mockFindFirst.mockResolvedValueOnce({ whatsappTransport: 'notify', notifyApiKeyEncrypted: null })
    const t = await resolveTransport('pnid-3')
    expect(t.mode).toBe('error')
  })

  it('returns error when the stored key cannot be decrypted', async () => {
    mockFindFirst.mockResolvedValueOnce({
      whatsappTransport: 'notify',
      notifyApiKeyEncrypted: 'v1:garbage:garbage:garbage',
    })
    const t = await resolveTransport('pnid-4')
    expect(t.mode).toBe('error')
  })

  it('fails open to direct when the DB lookup throws (pre-notify behavior)', async () => {
    mockFindFirst.mockRejectedValueOnce(new Error('db down'))
    expect(await resolveTransport('pnid-5')).toEqual({ mode: 'direct' })
  })

  it('caches resolutions and clears via clearTransportCache', async () => {
    mockFindFirst.mockResolvedValue({ whatsappTransport: 'direct', notifyApiKeyEncrypted: null })

    await resolveTransport('pnid-6')
    await resolveTransport('pnid-6')
    expect(mockFindFirst).toHaveBeenCalledTimes(1)

    clearTransportCache()
    await resolveTransport('pnid-6')
    expect(mockFindFirst).toHaveBeenCalledTimes(2)
  })

  it('does not cache error states so a fix applies immediately', async () => {
    mockFindFirst.mockResolvedValueOnce({ whatsappTransport: 'notify', notifyApiKeyEncrypted: null })
    expect((await resolveTransport('pnid-7')).mode).toBe('error')

    mockFindFirst.mockResolvedValueOnce({
      whatsappTransport: 'notify',
      notifyApiKeyEncrypted: encryptNotifySecret('nsk_fixed'),
    })
    expect(await resolveTransport('pnid-7')).toEqual({ mode: 'notify', apiKey: 'nsk_fixed' })
  })
})
