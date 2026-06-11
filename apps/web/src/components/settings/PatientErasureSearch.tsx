'use client'

import * as React from 'react'
import { usePatientSearch } from '@/hooks/usePatientSearch'

interface PatientResult {
  id: string
  name: string
  phone: string | null
}

interface PatientErasureSearchProps {
  onErase: (patient: PatientResult) => void
  erasedIds: Set<string>
}

export function PatientErasureSearch({ onErase, erasedIds }: PatientErasureSearchProps) {
  const [query, setQuery] = React.useState('')
  const { results, loading } = usePatientSearch(query)

  return (
    <div className="space-y-3">
      <div className="relative">
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
          placeholder="Search patient by name or phone…"
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-[13px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
        />
      </div>

      {loading && (
        <p className="text-[12px] text-muted-foreground">Searching…</p>
      )}

      {!loading && query.length >= 3 && results.length === 0 && (
        <p className="text-[12px] text-muted-foreground">No patients found.</p>
      )}

      {results.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {results.map((p) => {
            const erased = erasedIds.has(p.id)
            return (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {erased ? <span className="italic text-muted-foreground">Deleted Patient</span> : p.name}
                  </p>
                  {p.phone && !erased && (
                    <p className="text-[12px] text-muted-foreground">{p.phone}</p>
                  )}
                </div>
                {!erased && (
                  <button
                    onClick={() => onErase({ id: p.id, name: p.name, phone: p.phone ?? null })}
                    className="shrink-0 rounded px-2.5 py-1 text-[12px] font-semibold text-red-600 hover:bg-red-50"
                  >
                    Erase Data
                  </button>
                )}
                {erased && (
                  <span className="shrink-0 text-[12px] text-muted-foreground">Erased</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
