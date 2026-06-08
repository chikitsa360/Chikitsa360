'use client'

import * as React from 'react'

export interface VisitHistoryEntry {
  id: string
  appointment_date: string
  appointment_time: string | null
  doctor_name: string
  status: string
  token_number: number | null
  booking_source: string
  note_id: string | null
  note_text: string | null
  consultation_fee: number | null
  payment_status: 'paid' | 'unpaid'
}

export interface VisitHistoryResult {
  appointments: VisitHistoryEntry[]
  pagination: { total: number; page: number; limit: number; totalPages: number }
}

export function useVisitHistory(patientId: string) {
  const [data, setData] = React.useState<VisitHistoryResult | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [page, setPage] = React.useState(1)

  const fetchPage = React.useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/patients/${patientId}/appointments?page=${p}&limit=10`)
      if (!res.ok) throw new Error('Failed to load visit history')
      const json = await res.json() as VisitHistoryResult
      setData((prev) => {
        if (!prev || p === 1) return json
        return {
          ...json,
          appointments: [...prev.appointments, ...json.appointments],
        }
      })
      setPage(p)
      setError(null)
    } catch {
      setError('Failed to load visit history')
    } finally {
      setLoading(false)
    }
  }, [patientId])

  React.useEffect(() => {
    void fetchPage(1)
  }, [fetchPage])

  const loadMore = React.useCallback(() => {
    if (!data) return
    if (page < data.pagination.totalPages) {
      void fetchPage(page + 1)
    }
  }, [data, page, fetchPage])

  // Update a single visit note in-place (optimistic)
  const updateNote = React.useCallback((appointmentId: string, note: string) => {
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        appointments: prev.appointments.map((a) =>
          a.id === appointmentId ? { ...a, note_text: note } : a
        ),
      }
    })
  }, [])

  return { data, loading, error, loadMore, updateNote }
}
