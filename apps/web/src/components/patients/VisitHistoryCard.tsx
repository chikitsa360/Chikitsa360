'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'
import type { VisitHistoryEntry } from '@/hooks/useVisitHistory'
import { VisitNoteEditor } from './VisitNoteEditor'
import { VisitNoteDisplay } from './VisitNoteDisplay'

interface VisitHistoryCardProps {
  entry: VisitHistoryEntry
  canEditNote: boolean
  onNoteUpdated: (appointmentId: string, note: string) => void
}

const STATUS_STYLES: Record<string, { border: string; badge: string; text: string }> = {
  completed:  { border: 'border-l-success',     badge: 'bg-success/10 text-success',     text: 'Completed' },
  confirmed:  { border: 'border-l-primary',     badge: 'bg-primary/10 text-primary',     text: 'Confirmed' },
  scheduled:  { border: 'border-l-primary',     badge: 'bg-primary/10 text-primary',     text: 'Scheduled' },
  cancelled:  { border: 'border-l-destructive', badge: 'bg-destructive/10 text-destructive', text: 'Cancelled' },
  'no-show':  { border: 'border-l-warning',     badge: 'bg-warning/10 text-warning',     text: 'No Show' },
}

function formatDate(dateStr: string, timeStr: string | null): string {
  const date = new Date(dateStr + 'T00:00:00')
  const formatted = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  if (!timeStr) return formatted
  const [h, m] = timeStr.split(':')
  if (!h || !m) return formatted
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${formatted}, ${hour12}:${m} ${ampm}`
}

export function VisitHistoryCard({ entry, canEditNote, onNoteUpdated }: VisitHistoryCardProps) {
  const [editing, setEditing] = React.useState(false)
  const style = STATUS_STYLES[entry.status] ?? STATUS_STYLES['confirmed']!

  return (
    <div className={cn(
      'rounded-md border-l-4 border border-border bg-card p-4 mb-2 cursor-pointer transition-colors hover:border-primary/30',
      style!.border
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[13px] font-semibold text-foreground">
            {formatDate(entry.appointment_date, entry.appointment_time)}
          </div>
          <div className="mt-0.5 text-[12px] text-muted-foreground">{entry.doctor_name}</div>
        </div>
        <span className={cn('inline-flex items-center h-5 rounded-full px-2 text-[11px] font-medium', style!.badge)}>
          {style!.text}
        </span>
      </div>

      {/* Token */}
      {entry.token_number != null && (
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          Token #{entry.token_number}
        </div>
      )}

      {/* Billing */}
      <div className="mt-1.5 flex items-center gap-2">
        {entry.consultation_fee !== null ? (
          <>
            <span className="text-[12px] font-medium text-foreground">₹{entry.consultation_fee}</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                entry.payment_status === 'paid'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {entry.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-muted-foreground">No fee recorded</span>
        )}
      </div>

      {/* Note section */}
      {entry.status === 'completed' && (
        <div className="mt-2">
          {editing ? (
            <VisitNoteEditor
              appointmentId={entry.id}
              initialNote={entry.note_text}
              onSaved={(note) => {
                setEditing(false)
                onNoteUpdated(entry.id, note)
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <VisitNoteDisplay
              note={entry.note_text}
              canEdit={canEditNote}
              onEditClick={() => setEditing(true)}
            />
          )}
        </div>
      )}
    </div>
  )
}
