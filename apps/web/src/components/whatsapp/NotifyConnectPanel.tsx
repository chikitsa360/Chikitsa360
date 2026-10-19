'use client'

import * as React from 'react'

/**
 * Connects the clinic's WhatsApp through the Notify platform
 * (POST /api/v1/clinics/whatsapp/connect-notify). Two paths:
 *
 *  - Managed (Embedded Signup): Meta's popup runs under Notify's Tech Provider
 *    app and creates the clinic's WABA + phone number. Requires the
 *    NEXT_PUBLIC_NOTIFY_META_APP_ID / NEXT_PUBLIC_NOTIFY_ES_CONFIG_ID values
 *    (passed in as props from a server component).
 *  - BYO (manual): the clinic pastes its own Meta credentials. Always available.
 *
 * Embedded Signup mechanics mirror notify-sdk's EmbeddedSignupButton: the popup
 * (a) posts a WA_EMBEDDED_SIGNUP message with the new WABA/phone ids and
 * (b) resolves FB.login with a one-shot OAuth code (~30s TTL) — both halves are
 * required, so we poll briefly for the message before finalizing server-side.
 */

declare global {
  interface Window {
    FB?: {
      init: (config: object) => void
      login: (
        callback: (response: {
          authResponse?: { accessToken?: string; code?: string } | null
        }) => void,
        opts: object
      ) => void
    }
    fbAsyncInit?: () => void
  }
}

const SDK_URL = 'https://connect.facebook.net/en_US/sdk.js'
const GRAPH_VERSION = 'v20.0'

interface NotifyConnectPanelProps {
  /** Notify platform's Meta App ID (NEXT_PUBLIC_NOTIFY_META_APP_ID) */
  metaAppId?: string
  /** Notify's Embedded Signup configuration id (NEXT_PUBLIC_NOTIFY_ES_CONFIG_ID) */
  esConfigId?: string
  onConnected?: () => void
}

export function NotifyConnectPanel({ metaAppId, esConfigId, onConnected }: NotifyConnectPanelProps) {
  const managedAvailable = Boolean(metaAppId && esConfigId)

  const [sdkReady, setSdkReady] = React.useState(false)
  const [connecting, setConnecting] = React.useState(false)
  const [error, setError] = React.useState('')
  const [showByo, setShowByo] = React.useState(false)

  // BYO form state
  const [accessToken, setAccessToken] = React.useState('')
  const [phoneNumberId, setPhoneNumberId] = React.useState('')
  const [wabaId, setWabaId] = React.useState('')
  const [appSecret, setAppSecret] = React.useState('')

  // Posted by the popup before the login callback fires; ref so the callback
  // closure always sees the latest value.
  const signupInfo = React.useRef<{ wabaId?: string; phoneNumberId?: string }>({})

  React.useEffect(() => {
    if (!managedAvailable) return

    const onMessage = (event: MessageEvent) => {
      let origin: string
      try {
        origin = new URL(event.origin).hostname
      } catch {
        return
      }
      // Meta hosts the popup on many *.facebook.com subdomains
      if (origin !== 'facebook.com' && !origin.endsWith('.facebook.com')) return

      let data: unknown
      try {
        data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch {
        return
      }
      const parsed = data as {
        type?: string
        data?: { waba_id?: string; phone_number_id?: string }
      }
      if (parsed?.type === 'WA_EMBEDDED_SIGNUP' && parsed?.data?.waba_id) {
        signupInfo.current = {
          wabaId: String(parsed.data.waba_id),
          phoneNumberId: parsed.data.phone_number_id
            ? String(parsed.data.phone_number_id)
            : undefined,
        }
      }
    }
    window.addEventListener('message', onMessage)

    if (window.FB) {
      setSdkReady(true)
    } else {
      window.fbAsyncInit = () => {
        window.FB?.init({
          appId: metaAppId,
          autoLogAppEvents: true,
          xfbml: false,
          version: GRAPH_VERSION,
        })
        setSdkReady(true)
      }
      if (!document.querySelector(`script[src="${SDK_URL}"]`)) {
        const script = document.createElement('script')
        script.src = SDK_URL
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
    }

    return () => window.removeEventListener('message', onMessage)
  }, [managedAvailable, metaAppId])

  async function postConnect(body: Record<string, unknown>): Promise<void> {
    const res = await fetch('/api/v1/clinics/whatsapp/connect-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Connection failed. Please try again.')
  }

  async function finalizeEmbeddedSignup(code: string): Promise<void> {
    // The WA_EMBEDDED_SIGNUP message usually lands before the login callback,
    // but it is not guaranteed — poll briefly rather than racing it.
    for (let i = 0; i < 20 && !signupInfo.current.wabaId; i++) {
      await new Promise((r) => setTimeout(r, 250))
    }
    const info = signupInfo.current
    if (!info.wabaId || !info.phoneNumberId) {
      throw new Error(
        'Signup finished but Meta did not report the new account ids — please try again'
      )
    }
    await postConnect({
      method: 'embedded_signup',
      code,
      wabaId: info.wabaId,
      phoneNumberId: info.phoneNumberId,
    })
  }

  function launchEmbeddedSignup() {
    if (!window.FB || !esConfigId) return
    setConnecting(true)
    setError('')
    signupInfo.current = {}
    window.FB.login(
      (response) => {
        const code = response.authResponse?.code
        if (!code) {
          setConnecting(false)
          setError('Signup was cancelled before completing.')
          return
        }
        finalizeEmbeddedSignup(code)
          .then(() => onConnected?.())
          .catch((err: unknown) =>
            setError(err instanceof Error ? err.message : 'Connection failed.')
          )
          .finally(() => setConnecting(false))
      },
      {
        config_id: esConfigId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, sessionInfoVersion: '3' },
      }
    )
  }

  async function handleByoSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accessToken.trim() || !phoneNumberId.trim()) {
      setError('Access token and Phone Number ID are required.')
      return
    }
    setConnecting(true)
    setError('')
    try {
      await postConnect({
        method: 'manual',
        accessToken: accessToken.trim(),
        phoneNumberId: phoneNumberId.trim(),
        ...(wabaId.trim() ? { wabaId: wabaId.trim() } : {}),
        ...(appSecret.trim() ? { appSecret: appSecret.trim() } : {}),
      })
      onConnected?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed.')
    } finally {
      setConnecting(false)
    }
  }

  const byoInputClass =
    'h-11 w-full rounded-lg border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none'

  return (
    <div>
      {error && (
        <div
          className="mb-4 rounded-xl border border-warning/30 px-4 py-3"
          style={{ background: 'rgba(245,158,11,0.06)', color: '#D97706' }}
        >
          <p className="text-[13px] font-medium">{error}</p>
        </div>
      )}

      {/* Managed path — Embedded Signup under Notify's Meta app */}
      {managedAvailable ? (
        <button
          type="button"
          onClick={launchEmbeddedSignup}
          disabled={!sdkReady || connecting}
          className="mb-3 flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-primary text-[14px] font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          {connecting
            ? 'Completing WhatsApp setup… Don’t close this window.'
            : sdkReady
              ? 'Connect WhatsApp'
              : 'Loading…'}
        </button>
      ) : (
        <div className="mb-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <p className="text-[13px] text-muted-foreground">
            One-click WhatsApp signup isn&rsquo;t configured in this environment yet. You can
            connect with your own Meta API credentials below, or skip and set this up later.
          </p>
        </div>
      )}

      {/* BYO path — clinic brings its own Meta credentials */}
      <button
        type="button"
        onClick={() => setShowByo((v) => !v)}
        className="mb-3 text-[13px] font-medium text-primary hover:underline"
      >
        {showByo ? 'Hide manual setup' : 'I already have Meta API credentials'}
      </button>

      {showByo && (
        <form onSubmit={handleByoSubmit} className="mb-3 rounded-xl border border-border p-4">
          <div className="mb-3">
            <label htmlFor="byo-access-token" className="mb-1 block text-[13px] font-medium text-foreground">
              Permanent Access Token <span className="text-error">*</span>
            </label>
            <input
              id="byo-access-token"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAAG…"
              className={byoInputClass}
              autoComplete="off"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="byo-phone-id" className="mb-1 block text-[13px] font-medium text-foreground">
              Phone Number ID <span className="text-error">*</span>
            </label>
            <input
              id="byo-phone-id"
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="e.g. 112233445566778"
              className={byoInputClass}
              autoComplete="off"
            />
          </div>
          <div className="mb-3">
            <label htmlFor="byo-waba-id" className="mb-1 block text-[13px] font-medium text-foreground">
              WABA ID <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="byo-waba-id"
              type="text"
              value={wabaId}
              onChange={(e) => setWabaId(e.target.value)}
              className={byoInputClass}
              autoComplete="off"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="byo-app-secret" className="mb-1 block text-[13px] font-medium text-foreground">
              App Secret <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="byo-app-secret"
              type="password"
              value={appSecret}
              onChange={(e) => setAppSecret(e.target.value)}
              className={byoInputClass}
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={connecting}
            className="h-10 w-full rounded-lg bg-primary text-[13px] font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {connecting ? 'Connecting…' : 'Connect with these credentials'}
          </button>
        </form>
      )}
    </div>
  )
}
