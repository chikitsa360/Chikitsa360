'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'

interface VisitNoteDisplayProps {
  note: string | null
  canEdit: boolean
  onEditClick: () => void
}

export function VisitNoteDisplay({ note, canEdit, onEditClick }: VisitNoteDisplayProps) {
  const [expanded, setExpanded] = React.useState(false)
  const EXCERPT_LEN = 100

  if (!note) {
    if (!canEdit) return null
    return (
      <button
        onClick={onEditClick}
        className="mt-2 text-[14px] text-primary underline-offset-2 hover:underline transition-colors"
      >
        + Add visit note
      </button>
    )
  }

  const isLong = note.length > EXCERPT_LEN
  const displayText = isLong && !expanded ? note.slice(0, EXCERPT_LEN) : note

  return (
    <div className="mt-2 group">
      <p className={cn('text-[14px] italic text-muted-foreground leading-relaxed whitespace-pre-wrap')}>
        {displayText}
        {isLong && !expanded && (
          <>
            {'… '}
            <button
              onClick={() => setExpanded(true)}
              className="text-primary not-italic hover:underline"
            >
              see more
            </button>
          </>
        )}
      </p>
      {canEdit && (
        <button
          onClick={onEditClick}
          className={cn(
            'mt-1 flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors',
            'opacity-0 group-hover:opacity-100 md:opacity-0 max-md:opacity-100'
          )}
          aria-label="Edit note"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
            <path strokeLinecap="round" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </button>
      )}
    </div>
  )
}
