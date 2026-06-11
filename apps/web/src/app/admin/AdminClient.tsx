'use client'

import * as React from 'react'
import { ClinicTable } from '@/components/admin/ClinicTable'
import { ClinicDetailPanel } from '@/components/admin/ClinicDetailPanel'

interface ClinicRow {
  id: string
  name: string
  slug: string
  plan: string
  planExpiresAt: string | null
  doctorLimit: number
  doctorCount: number
  planStatus: 'active' | 'expiring_soon' | 'expired'
  ownerName: string | null
  ownerPhone: string | null
  createdAt: string
}

interface AdminApiResponse {
  clinics: ClinicRow[]
  total: number
  page: number
  limit: number
}

export function AdminClient() {
  const [clinics, setClinics] = React.useState<ClinicRow[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [query, setQuery] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [selected, setSelected] = React.useState<ClinicRow | null>(null)

  const fetchClinics = React.useCallback(async (q: string, p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ q, page: String(p) })
      const res = await fetch(`/api/admin/clinics?${params}`)
      if (!res.ok) return
      const data = await res.json() as AdminApiResponse
      setClinics(data.clinics)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounced search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchClinics(query, 1)
    }, 300)
    return () => clearTimeout(timer)
  }, [query, fetchClinics])

  React.useEffect(() => {
    fetchClinics(query, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  function handleSaved(clinicId: string, updates: { plan: string; planExpiresAt: string | null; doctorLimit: number }) {
    setClinics((prev) =>
      prev.map((c) => c.id === clinicId ? { ...c, ...updates } : c)
    )
    if (selected?.id === clinicId) {
      setSelected((prev) => prev ? { ...prev, ...updates } : null)
    }
  }

  const totalPages = Math.ceil(total / 25)

  return (
    <div className="flex gap-6">
      {/* Left: table */}
      <div className="min-w-0 flex-1">
        {/* Search */}
        <div className="relative mb-4">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by clinic name or owner phone…"
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-[13px] outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          />
        </div>

        {loading ? (
          <p className="text-[13px] text-muted-foreground">Loading…</p>
        ) : (
          <>
            <ClinicTable
              clinics={clinics}
              selectedId={selected?.id ?? null}
              onSelect={setSelected}
            />
            <div className="mt-3 flex items-center justify-between text-[12px] text-muted-foreground">
              <span>{total} clinics total</span>
              {totalPages > 1 && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded border border-border px-2.5 py-1 hover:bg-muted disabled:opacity-40"
                  >
                    ←
                  </button>
                  <span className="px-2 py-1">Page {page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded border border-border px-2.5 py-1 hover:bg-muted disabled:opacity-40"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right: detail panel */}
      {selected && (
        <div className="w-[420px] shrink-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm" style={{ height: 'calc(100vh - 140px)' }}>
          <ClinicDetailPanel
            clinic={selected}
            onClose={() => setSelected(null)}
            onSaved={(updates) => handleSaved(selected.id, updates)}
          />
        </div>
      )}
    </div>
  )
}
