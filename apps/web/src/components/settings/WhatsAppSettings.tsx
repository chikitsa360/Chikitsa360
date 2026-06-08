'use client'

import * as React from 'react'
import { WhatsAppStatusIndicator } from '@/components/onboarding/WhatsAppStatusIndicator'

const TEMPLATES = [
  { key: 'apt_confirmation', label: 'Appointment Confirmation' },
  { key: 'apt_reminder_24h', label: '24h Reminder' },
  { key: 'apt_reminder_2h', label: '2h Reminder' },
  { key: 'apt_cancellation', label: 'Cancellation' },
]

interface WhatsAppStatus {
  connected: boolean
  wabaId?: string | null
  phoneNumberId?: string | null
}

export function WhatsAppSettings() {
  const [status, setStatus] = React.useState<WhatsAppStatus | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [commLanguage, setCommLanguage] = React.useState('en')
  const [saving, setSaving] = React.useState(false)
  const [saveSuccess, setSaveSuccess] = React.useState(false)

  React.useEffect(() => {
    fetch('/api/v1/clinics/whatsapp/status')
      .then((r) => r.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus({ connected: false }))
      .finally(() => setLoading(false))
  }, [])

  async function handleSaveLanguage() {
    setSaving(true)
    // Persist to clinic settings — stubbed for this story
    await new Promise((r) => setTimeout(r, 500))
    setSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  if (loading) {
    return <div className="py-8 text-center text-[13px] text-muted-foreground">Loading...</div>
  }

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-foreground" style={{ letterSpacing: '-0.015em' }}>
          WhatsApp Business
        </h1>
      </div>

      {/* Connection status card */}
      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card px-6 py-5">
        <div className="mb-4 flex items-center gap-3">
          {status?.connected ? (
            <>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-white"
                style={{ background: '#10B981' }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <div>
                <div className="text-[14px] font-semibold text-foreground">Connected</div>
                {status.phoneNumberId && (
                  <div className="text-[12px] text-muted-foreground">ID: {status.phoneNumberId}</div>
                )}
              </div>
            </>
          ) : (
            <>
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </span>
              <div>
                <div className="text-[14px] font-semibold text-foreground">Not Connected</div>
                <div className="text-[12px] text-muted-foreground">WhatsApp booking and reminders inactive</div>
              </div>
            </>
          )}
        </div>

        {/* Status indicator */}
        <WhatsAppStatusIndicator completedSteps={status?.connected ? 1 : 0} />

        {/* Reconnect button */}
        <div className="mt-4 flex justify-end">
          <a
            href="/onboarding/step-4"
            className="rounded-lg border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            {status?.connected ? 'Reconnect WhatsApp' : 'Connect WhatsApp'}
          </a>
        </div>
      </div>

      {/* Template status */}
      <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <div className="text-[14px] font-semibold text-foreground">Message Templates</div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">Templates must be approved by Meta before use.</p>
        </div>
        {TEMPLATES.map((tpl, idx) => (
          <div
            key={tpl.key}
            className={`flex items-center justify-between px-5 py-3 ${idx > 0 ? 'border-t border-border' : ''}`}
          >
            <span className="text-[13px] text-foreground">{tpl.label}</span>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
              style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}
            >
              Pending
            </span>
          </div>
        ))}
      </div>

      {/* Communication language */}
      <div className="overflow-hidden rounded-xl border border-border bg-card px-5 py-5">
        <div className="mb-3">
          <label className="text-[13px] font-medium text-foreground">
            Clinic Communication Language
          </label>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Language used for WhatsApp messages to patients. Portal language is changed separately.
          </p>
        </div>
        <select
          value={commLanguage}
          onChange={(e) => setCommLanguage(e.target.value)}
          className="mb-4 h-11 w-full rounded-lg border border-border bg-card px-3 text-[13px] text-foreground focus:border-primary focus:outline-none"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी (Hindi)</option>
        </select>

        {saveSuccess && (
          <p className="mb-3 text-[13px] text-success">Language preference saved.</p>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSaveLanguage}
            disabled={saving}
            className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
