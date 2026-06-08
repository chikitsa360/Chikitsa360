'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'
import { useVisitNote } from '@/hooks/useVisitNote'

const MAX_CHARS = 500
const AMBER_THRESHOLD = 450
const RED_THRESHOLD = 490

interface VisitNoteEditorProps {
  appointmentId: string
  initialNote: string | null
  onSaved: (note: string) => void
  onCancel: () => void
}

export function VisitNoteEditor({ appointmentId, initialNote, onSaved, onCancel }: VisitNoteEditorProps) {
  const [text, setText] = React.useState(initialNote ?? '')
  const { saveNote, saving } = useVisitNote(appointmentId)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const charCount = [...text].length // Unicode code points, not bytes
  const counterColor =
    charCount >= RED_THRESHOLD
      ? 'text-red-500'
      : charCount >= AMBER_THRESHOLD
        ? 'text-amber-500'
        : 'text-muted-foreground'

  const handleSave = async () => {
    if (!text.trim()) return
    const saved = await saveNote(text)
    if (saved !== null) {
      onSaved(saved)
    }
  }

  return (
    <div className="mt-2 animate-in fade-in duration-150">
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        maxLength={MAX_CHARS}
        placeholder="Write a visit note…"
        className={cn(
          'w-full resize-y rounded-md border border-border bg-background',
          'px-3 py-2.5 text-[14px] text-foreground leading-relaxed',
          'placeholder:text-muted-foreground placeholder:italic',
          'focus:outline-none focus:border-primary focus:ring-0',
          'min-h-[80px]'
        )}
      />
      <div className="mt-1 flex items-center justify-between">
        <span className={cn('font-mono text-[12px] tabular-nums', counterColor)}>
          {charCount} / {MAX_CHARS}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-8 rounded-md border border-border px-3 text-[12px] font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { void handleSave() }}
            disabled={!text.trim() || saving}
            className={cn(
              'h-8 rounded-md bg-primary px-3 text-[12px] font-medium text-white transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'hover:bg-primary/90'
            )}
          >
            {saving ? 'Saving…' : 'Save Note'}
          </button>
        </div>
      </div>
    </div>
  )
}
