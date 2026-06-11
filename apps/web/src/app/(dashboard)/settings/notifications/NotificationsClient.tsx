'use client'

import * as React from 'react'
import { ReminderToggleRow, type TemplateStatus } from '@/components/settings/ReminderToggleRow'
import { OptOutMetric } from '@/components/settings/OptOutMetric'
import { useToast } from '@/components/ui/ToastProvider'

interface NotificationsClientProps {
  reminder24hEnabled: boolean
  reminder2hEnabled: boolean
  eventReminder24hEnabled: boolean
  optOutCount: number
}

interface ConfirmDialog {
  field: '24h' | '2h' | 'event-24h'
  message: string
}

// MVP: template status is hardcoded as approved pending actual Meta API integration
const TEMPLATE_STATUS: TemplateStatus = 'approved'

export function NotificationsClient({
  reminder24hEnabled: initial24h,
  reminder2hEnabled: initial2h,
  eventReminder24hEnabled: initialEvent24h,
  optOutCount,
}: NotificationsClientProps) {
  const { addToast } = useToast()
  const [enabled24h, setEnabled24h] = React.useState(initial24h)
  const [enabled2h, setEnabled2h] = React.useState(initial2h)
  const [enabledEvent24h, setEnabledEvent24h] = React.useState(initialEvent24h)
  const [saving, setSaving] = React.useState(false)
  const [confirmDialog, setConfirmDialog] = React.useState<ConfirmDialog | null>(null)

  const allAptDisabled = !enabled24h && !enabled2h

  async function patchSettings(field: 'reminder_24h_enabled' | 'reminder_2h_enabled' | 'event_reminder_24h_enabled', value: boolean) {
    setSaving(true)
    try {
      const res = await fetch('/api/v1/clinics/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error('Failed to save')

      const labelMap = { reminder_24h_enabled: '24-hour appointment', reminder_2h_enabled: '2-hour appointment', event_reminder_24h_enabled: '24-hour event' }
      const label = labelMap[field]
      addToast({
        variant: 'success',
        message: value
          ? `${label.charAt(0).toUpperCase() + label.slice(1)} reminders enabled.`
          : `${label.charAt(0).toUpperCase() + label.slice(1)} reminders disabled. Changes apply to future reminder sends.`,
      })
    } catch {
      addToast({ variant: 'error', message: 'Failed to save settings. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  function handleToggle24h(value: boolean) {
    if (!value) {
      // Disabling requires confirmation dialog
      setConfirmDialog({
        field: '24h',
        message:
          'Disable 24-hour reminders? Patients with upcoming appointments will no longer receive this reminder. Already sent reminders are unaffected.',
      })
    } else {
      setEnabled24h(true)
      void patchSettings('reminder_24h_enabled', true)
    }
  }

  function handleToggle2h(value: boolean) {
    if (!value) {
      setConfirmDialog({
        field: '2h',
        message:
          'Disable 2-hour reminders? Patients with upcoming appointments will no longer receive this reminder. Already sent reminders are unaffected.',
      })
    } else {
      setEnabled2h(true)
      void patchSettings('reminder_2h_enabled', true)
    }
  }

  function handleToggleEvent24h(value: boolean) {
    if (!value) {
      setConfirmDialog({
        field: 'event-24h',
        message:
          'Disable event reminders? Registered participants will no longer receive a 24-hour reminder before events.',
      })
    } else {
      setEnabledEvent24h(true)
      void patchSettings('event_reminder_24h_enabled', true)
    }
  }

  function handleConfirmDisable() {
    if (!confirmDialog) return
    if (confirmDialog.field === '24h') {
      setEnabled24h(false)
      void patchSettings('reminder_24h_enabled', false)
    } else if (confirmDialog.field === '2h') {
      setEnabled2h(false)
      void patchSettings('reminder_2h_enabled', false)
    } else {
      setEnabledEvent24h(false)
      void patchSettings('event_reminder_24h_enabled', false)
    }
    setConfirmDialog(null)
  }

  return (
    <div className="mx-auto max-w-[640px] space-y-5">
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-[15px] font-semibold text-foreground">Automated WhatsApp Reminders</h2>
        <p className="mb-4 text-[13px] text-muted-foreground">
          Configure which automated reminder messages are sent to patients via WhatsApp.
        </p>

        {/* All-disabled amber banner */}
        {allAptDisabled && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-700">
            <span aria-hidden>⚠</span>
            <span>All automated reminders are currently disabled for this clinic.</span>
          </div>
        )}

        <div>
          <ReminderToggleRow
            label="24-Hour Appointment Reminder"
            description="Sent 24 hours before the appointment. Includes a cancel option for the patient."
            templateName="apt_reminder_24h"
            templateStatus={TEMPLATE_STATUS}
            enabled={enabled24h}
            disabled={saving}
            onChange={handleToggle24h}
          />
          <ReminderToggleRow
            label="2-Hour Appointment Reminder"
            description="Sent 2 hours before the appointment as a final reminder."
            templateName="apt_reminder_2h"
            templateStatus={TEMPLATE_STATUS}
            enabled={enabled2h}
            disabled={saving}
            onChange={handleToggle2h}
          />
        </div>

        <div className="mt-2 border-t border-border pt-3">
          <OptOutMetric count={optOutCount} />
        </div>
      </div>

      {/* Event reminders section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-1 text-[15px] font-semibold text-foreground">Event Reminders</h2>
        <p className="mb-4 text-[13px] text-muted-foreground">
          Configure automated reminder messages sent to event registrants via WhatsApp.
        </p>
        <ReminderToggleRow
          label="Event Reminder (24h before)"
          description="Sent 24 hours before the event to all confirmed registrants with event details."
          templateName="event_reminder_24h"
          templateStatus={TEMPLATE_STATUS}
          enabled={enabledEvent24h}
          disabled={saving}
          onChange={handleToggleEvent24h}
        />
      </div>

      {/* Confirmation dialog */}
      {confirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
            <h3 className="mb-2 text-[15px] font-semibold text-foreground">
              Disable {confirmDialog.field === '24h' ? '24-hour appointment' : confirmDialog.field === '2h' ? '2-hour appointment' : 'event 24-hour'} reminders?
            </h3>
            <p className="mb-6 text-[13px] text-muted-foreground">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="rounded-md border border-border px-4 py-1.5 text-[13px] text-foreground hover:bg-muted"
              >
                Keep Enabled
              </button>
              <button
                type="button"
                onClick={handleConfirmDisable}
                className="rounded-md bg-amber-500 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-amber-600"
              >
                Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
