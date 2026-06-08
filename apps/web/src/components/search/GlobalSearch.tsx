'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@chikitsa360/core'
import { usePatientSearch } from '@/hooks/usePatientSearch'

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState('')
  const { results, loading } = usePatientSearch(query)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Focus input when opened
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [open])

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  const navigateTo = (href: string) => {
    onClose()
    router.push(href)
  }

  const hasResults = results.length > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/40 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-card shadow-2xl animate-in slide-in-from-top-4 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patients, appointments…"
            className="flex-1 bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          )}
          <kbd className="rounded border border-border bg-muted px-1 text-[10px] text-muted-foreground">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {query.length < 3 && (
            <div className="py-6 text-center text-[12px] text-muted-foreground">
              Type at least 3 characters to search…
            </div>
          )}

          {query.length >= 3 && !loading && !hasResults && (
            <div className="py-6 text-center text-[12px] text-muted-foreground">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}

          {hasResults && (
            <>
              <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Patients
              </div>
              {results.slice(0, 5).map((p) => {
                const ini = p.name.split(' ').map((x) => x[0] ?? '').join('').toUpperCase().slice(0, 2)
                return (
                  <button
                    key={p.id}
                    onClick={() => navigateTo(`/patients/${p.id}`)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-3 py-2',
                      'text-left transition-colors hover:bg-muted'
                    )}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary">
                      {ini}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium text-foreground truncate">{p.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        +91 •••••{p.phone.slice(-4)}
                      </div>
                    </div>
                    <svg className="h-3.5 w-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                )
              })}
              {results.length > 5 && (
                <button
                  onClick={() => navigateTo(`/patients?q=${encodeURIComponent(query)}`)}
                  className="mt-1 w-full rounded-md py-2 text-center text-[12px] font-medium text-primary hover:bg-muted transition-colors"
                >
                  See all {results.length} results →
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
