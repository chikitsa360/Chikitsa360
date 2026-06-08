'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'
import { useVisitHistory } from '@/hooks/useVisitHistory'
import { VisitHistoryCard } from './VisitHistoryCard'

interface VisitHistoryListProps {
  patientId: string
  canEditNote: boolean
  onBookAppointment?: () => void
}

export function VisitHistoryList({ patientId, canEditNote, onBookAppointment }: VisitHistoryListProps) {
  const { data, loading, error, loadMore, updateNote } = useVisitHistory(patientId)

  if (loading && !data) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md border border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
        Failed to load visit history.
      </div>
    )
  }

  if (!data || data.appointments.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card px-6 py-10 text-center">
        <p className="text-[14px] text-muted-foreground">No appointments yet.</p>
        {onBookAppointment && (
          <button
            onClick={onBookAppointment}
            className="mt-3 h-8 rounded-md bg-primary px-4 text-[13px] font-medium text-white hover:bg-primary/90 transition-colors"
          >
            Book First Appointment
          </button>
        )}
      </div>
    )
  }

  const { appointments, pagination } = data
  const hasMore = pagination.page < pagination.totalPages

  return (
    <div>
      <div className="mb-3 text-[13px] font-medium text-muted-foreground">
        {pagination.total} appointment{pagination.total !== 1 ? 's' : ''}
      </div>
      <div>
        {appointments.map((entry) => (
          <VisitHistoryCard
            key={entry.id}
            entry={entry}
            canEditNote={canEditNote}
            onNoteUpdated={updateNote}
          />
        ))}
      </div>
      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className={cn(
            'mt-2 w-full py-2 text-center text-[13px] font-medium text-primary',
            'hover:underline transition-colors',
            loading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
