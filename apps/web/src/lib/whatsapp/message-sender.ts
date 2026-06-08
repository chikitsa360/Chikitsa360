/**
 * Meta Cloud API message sender — session messages (text + interactive).
 * Template messages are handled by sendTemplateMessage() in meta-whatsapp.ts.
 */

const GRAPH_URL = 'https://graph.facebook.com/v19.0'

function accessToken(): string {
  return process.env.META_SYSTEM_ACCESS_TOKEN ?? ''
}

async function postMessage(
  phoneNumberId: string,
  body: object
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const token = accessToken()
  if (!token) return { success: false, error: 'META_SYSTEM_ACCESS_TOKEN not set' }

  try {
    const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
    })

    const data = await res.json() as { messages?: Array<{ id: string }>; error?: { message: string } }
    if (!res.ok) {
      return { success: false, error: data?.error?.message ?? 'Message send failed' }
    }
    return { success: true, messageId: data?.messages?.[0]?.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

/**
 * Send a plain text session message.
 */
export async function sendText(
  phoneNumberId: string,
  to: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return postMessage(phoneNumberId, {
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: text },
  })
}

export interface QuickReplyButton {
  id: string
  title: string
}

/**
 * Send a WhatsApp interactive Quick Reply message (up to 3 buttons).
 */
export async function sendQuickReply(
  phoneNumberId: string,
  to: string,
  bodyText: string,
  buttons: QuickReplyButton[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return postMessage(phoneNumberId, {
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  })
}

export interface ListRow {
  id: string
  title: string
  description?: string
}

/**
 * Send a WhatsApp List Message (slot selection).
 */
export async function sendListMessage(
  phoneNumberId: string,
  to: string,
  headerText: string,
  bodyText: string,
  buttonLabel: string,
  rows: ListRow[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  return postMessage(phoneNumberId, {
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: headerText },
      body: { text: bodyText },
      action: {
        button: buttonLabel.slice(0, 20),
        sections: [{ rows: rows.map((r) => ({ id: r.id, title: r.title.slice(0, 24), description: r.description?.slice(0, 72) })) }],
      },
    },
  })
}
