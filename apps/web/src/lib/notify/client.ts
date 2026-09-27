/**
 * Thin client for the Notify platform's hosted /v1 API (api.azentis.in).
 * Used when a clinic's whatsappTransport = 'notify' — the clinic is a Notify
 * tenant and messages go out with its own nsk_ API key instead of the shared
 * META_SYSTEM_ACCESS_TOKEN.
 */

export interface NotifyButton {
  id: string
  title: string
}

export interface NotifyListSection {
  title?: string
  rows: Array<{ id: string; title: string; description?: string }>
}

export interface NotifySendPayload {
  to: string
  template: string
  text?: string
  buttons?: NotifyButton[]
  list?: {
    header?: string
    body: string
    buttonLabel: string
    footer?: string
    sections: NotifyListSection[]
  }
  hsmTemplate?: {
    name: string
    language: string
    components?: object[]
  }
}

interface NotifyEventResponse {
  id?: string
  waMessageId?: string
  status?: string
  error?: string
}

export function notifyApiUrl(): string {
  // Read inside the function (not module level) for testability with vi.stubEnv
  return (process.env.NOTIFY_API_URL ?? 'https://api.azentis.in').replace(/\/$/, '')
}

/**
 * POST /v1/send with a clinic's nsk_ API key. Returns the same result shape
 * as the direct Meta senders so callers are transport-agnostic. messageId is
 * the Meta wamid (waMessageId) so Redis messageId→appointment correlation
 * keeps working across transports.
 */
export async function notifySend(
  apiKey: string,
  payload: NotifySendPayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${notifyApiUrl()}/v1/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = (await res.json().catch(() => ({}))) as NotifyEventResponse & {
      error?: string
    }

    if (!res.ok) {
      return { success: false, error: data?.error ?? `Notify send failed (${res.status})` }
    }
    if (data.status === 'failed') {
      return { success: false, error: data.error ?? 'Notify reported send failure' }
    }
    return { success: true, messageId: data.waMessageId }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}
