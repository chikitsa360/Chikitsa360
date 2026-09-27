import { db } from '@/lib/db'

import { decryptNotifySecret } from './crypto'

/**
 * Resolves which WhatsApp transport a clinic uses, keyed by its
 * whatsappPhoneNumberId (the routing key every send-path caller already has).
 *
 * - 'direct'  → legacy Meta Cloud API path with META_SYSTEM_ACCESS_TOKEN.
 *               Default for every existing clinic — behavior unchanged.
 * - 'notify'  → the clinic is a Notify tenant; sends go to /v1/send with its
 *               own decrypted nsk_ API key.
 * - 'error'   → clinic is flagged 'notify' but its key is missing/undecryptable.
 *               Callers return a failed send (never silently fall back to
 *               'direct' — a Notify-managed WABA is not accessible with the
 *               shared token, and a misleading partial success would mask the
 *               misconfiguration).
 */
export type ResolvedTransport =
  | { mode: 'direct' }
  | { mode: 'notify'; apiKey: string }
  | { mode: 'error'; error: string }

interface CacheEntry {
  value: ResolvedTransport
  expiresAt: number
}

const CACHE_TTL_MS = 60_000
const cache = new Map<string, CacheEntry>()

/** Test hook + used by the connect flow so a transport flip applies immediately. */
export function clearTransportCache(): void {
  cache.clear()
}

export async function resolveTransport(phoneNumberId: string): Promise<ResolvedTransport> {
  if (!phoneNumberId) return { mode: 'direct' }

  const cached = cache.get(phoneNumberId)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  let value: ResolvedTransport
  try {
    const clinic = await db.clinic.findFirst({
      where: { whatsappPhoneNumberId: phoneNumberId },
      select: { whatsappTransport: true, notifyApiKeyEncrypted: true },
    })

    if (clinic?.whatsappTransport !== 'notify') {
      // Unknown phoneNumberId or transport 'direct' → today's exact behavior
      value = { mode: 'direct' }
    } else if (!clinic.notifyApiKeyEncrypted) {
      value = { mode: 'error', error: 'Clinic transport is notify but no API key is stored' }
    } else {
      try {
        value = { mode: 'notify', apiKey: decryptNotifySecret(clinic.notifyApiKeyEncrypted) }
      } catch (err) {
        value = {
          mode: 'error',
          error: err instanceof Error ? err.message : 'Failed to decrypt Notify API key',
        }
      }
    }
  } catch (err) {
    // DB lookup failure: fail open to direct — identical to pre-notify behavior
    console.error('[notify-transport] resolve failed, falling back to direct:', err)
    value = { mode: 'direct' }
  }

  // Don't cache error states — a fix (key stored, env corrected) applies immediately
  if (value.mode !== 'error') {
    cache.set(phoneNumberId, { value, expiresAt: Date.now() + CACHE_TTL_MS })
  }
  return value
}
