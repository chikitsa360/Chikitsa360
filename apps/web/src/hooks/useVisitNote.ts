'use client'

import * as React from 'react'

export function useVisitNote(appointmentId: string) {
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const saveNote = React.useCallback(async (note: string): Promise<string | null> => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/appointments/${appointmentId}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      })
      if (!res.ok) {
        const data = await res.json() as { error?: string }
        const msg = data.error ?? 'Failed to save note'
        setError(msg)
        return null
      }
      const data = await res.json() as { note: string }
      return data.note
    } catch {
      setError('Failed to save note')
      return null
    } finally {
      setSaving(false)
    }
  }, [appointmentId])

  return { saveNote, saving, error }
}
