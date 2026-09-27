import { notifyApiUrl } from './client'

/**
 * Server-to-server client for the Notify platform's partner provisioning API
 * (mounted at /partner, authenticated with NOTIFY_PARTNER_KEY). Used only by
 * the connect flow — never from the browser.
 */

function partnerKey(): string {
  // Read inside the function (not module level) for testability with vi.stubEnv
  return process.env.NOTIFY_PARTNER_KEY ?? ''
}

interface PartnerResult<T> {
  ok: boolean
  status: number
  data?: T
  error?: string
}

async function partnerFetch<T>(
  path: string,
  body?: object
): Promise<PartnerResult<T>> {
  const key = partnerKey()
  if (!key) return { ok: false, status: 500, error: 'NOTIFY_PARTNER_KEY not set' }

  try {
    const res = await fetch(`${notifyApiUrl()}/partner${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    const data = (await res.json().catch(() => ({}))) as T & { error?: string }
    if (!res.ok) {
      return { ok: false, status: res.status, error: data?.error ?? `Notify partner API ${res.status}` }
    }
    return { ok: true, status: res.status, data }
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: err instanceof Error ? err.message : 'Notify partner API unreachable',
    }
  }
}

export function createTenant(input: { name: string; category?: string; autoReplyEnabled?: boolean }) {
  return partnerFetch<{ tenantId: string }>('/tenants', input)
}

export function issueApiKey(tenantId: string, label?: string) {
  return partnerFetch<{ apiKey: string; keyId: string }>(`/tenants/${tenantId}/api-key`, { label })
}

export function registerWebhookEndpoint(tenantId: string, url: string) {
  return partnerFetch<{ endpointId: string; secret: string }>(`/tenants/${tenantId}/webhook-endpoints`, {
    url,
    events: ['sent', 'delivered', 'read', 'failed', 'reply'],
  })
}

export function saveManualCredentials(
  tenantId: string,
  input: { accessToken: string; phoneNumberId: string; wabaId?: string; appSecret?: string }
) {
  return partnerFetch<{ ok: boolean; verifiedName?: string; displayPhoneNumber?: string }>(
    `/tenants/${tenantId}/credentials`,
    input
  )
}

export function completeEmbeddedSignup(
  tenantId: string,
  input: { code: string; wabaId: string; phoneNumberId: string }
) {
  return partnerFetch<{ ok: boolean; displayName?: string; displayPhoneNumber?: string }>(
    `/tenants/${tenantId}/embedded-signup`,
    input
  )
}
