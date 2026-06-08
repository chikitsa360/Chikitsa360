'use client'

import * as React from 'react'

export type TemplateStatus = 'approved' | 'pending' | 'rejected'

interface ReminderToggleRowProps {
  label: string
  description: string
  templateName: string
  templateStatus: TemplateStatus
  enabled: boolean
  disabled?: boolean
  onChange: (enabled: boolean) => void
}

const statusConfig: Record<TemplateStatus, { label: string; className: string }> = {
  approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
  rejected: { label: 'Rejected', className: 'bg-red-100 text-red-600' },
}

export function ReminderToggleRow({
  label,
  description,
  templateName,
  templateStatus,
  enabled,
  disabled = false,
  onChange,
}: ReminderToggleRowProps) {
  const status = statusConfig[templateStatus]

  return (
    <div className="flex items-start gap-4 border-b border-border py-4 last:border-0">
      {/* Toggle */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={[
          'relative mt-0.5 h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          enabled ? 'bg-primary' : 'bg-neutral-300',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
            enabled ? 'translate-x-5' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>

      {/* Label + description */}
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-foreground">{label}</p>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
        {templateStatus !== 'approved' && (
          <p className="mt-1.5 text-[12px] text-amber-600">
            Template not yet approved by Meta — reminders will not send even if enabled.
          </p>
        )}
      </div>

      {/* Template status badge */}
      <div className="flex flex-col items-end gap-1">
        <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${status.className}`}>
          {status.label}
        </span>
        <span className="text-[11px] text-muted-foreground">{templateName}</span>
      </div>
    </div>
  )
}
