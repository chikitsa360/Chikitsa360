'use client'

import * as React from 'react'

export interface PatientSearchResult {
  id: string
  name: string
  phone: string
  dob: string | null
  gender: string | null
  booking_source: string
  created_at: string
  last_visit_date: string | null
  last_doctor_name: string | null
}

export function usePatientSearch(query: string, debounceMs = 300) {
  const [results, setResults] = React.useState<PatientSearchResult[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (query.length < 3) {
      setResults([])
      setTotal(0)
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/patients/search?q=${encodeURIComponent(query)}`)
        if (!res.ok) throw new Error('Search failed')
        const data = await res.json() as { patients: PatientSearchResult[]; total: number }
        setResults(data.patients)
        setTotal(data.total)
        setError(null)
      } catch {
        setError('Search failed')
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [query, debounceMs])

  return { results, total, loading, error }
}
