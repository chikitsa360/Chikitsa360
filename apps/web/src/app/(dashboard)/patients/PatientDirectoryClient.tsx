'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PatientSearchBar } from '@/components/patients/PatientSearchBar'
import { PatientDirectoryTable } from '@/components/patients/PatientDirectoryTable'
import { DuplicatePatientPrompt } from '@/components/patients/DuplicatePatientPrompt'
import { usePatientSearch } from '@/hooks/usePatientSearch'
import { useToast } from '@/components/ui/ToastProvider'
import type { PatientRow } from '@/components/patients/PatientDirectoryTable'

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface PatientDirectoryClientProps {
  initialPatients: PatientRow[]
  pagination: Pagination
  filterOptOut?: boolean
}

export function PatientDirectoryClient({ initialPatients, pagination, filterOptOut = false }: PatientDirectoryClientProps) {
  const { addToast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  const [query, setQuery] = React.useState(initialQuery)
  const { results: searchResults, loading: searching } = usePatientSearch(query)

  // New patient form state
  const [showNewForm, setShowNewForm] = React.useState(false)
  const [newName, setNewName] = React.useState('')
  const [newPhone, setNewPhone] = React.useState('')
  const [creating, setCreating] = React.useState(false)
  const [duplicatePatient, setDuplicatePatient] = React.useState<{ id: string; name: string; created_at: string } | null>(null)

  const isSearching = query.length >= 3
  const displayedPatients = isSearching ? (searchResults as PatientRow[]) : initialPatients

  const handleCreatePatient = async (forceCreate = false) => {
    if (!newName.trim() || !/^[6-9]\d{9}$/.test(newPhone)) return
    setCreating(true)
    try {
      const res = await fetch('/api/v1/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), phone: newPhone, force_create: forceCreate }),
      })
      const data = await res.json() as {
        duplicate_found?: boolean
        patient?: { id: string; name: string; created_at: string }
      }
      if (!res.ok) {
        addToast({ variant: 'error', message: 'Failed to add patient' })
        return
      }
      if (data.duplicate_found && data.patient) {
        setDuplicatePatient(data.patient)
        addToast({ variant: 'info', message: 'Patient with this phone already exists' })
        return
      }
      if (data.patient) {
        addToast({ variant: 'success', message: 'Patient added successfully' })
        router.push(`/patients/${data.patient.id}`)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      {duplicatePatient && (
        <DuplicatePatientPrompt
          patient={duplicatePatient}
          onClose={() => setDuplicatePatient(null)}
          onAddAnyway={() => {
            setDuplicatePatient(null)
            void handleCreatePatient(true)
          }}
        />
      )}

      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <PatientSearchBar
          value={query}
          onChange={setQuery}
          className="max-w-xs flex-1"
        />
        <div className="flex-1" />
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-1.5 h-[34px] rounded-md bg-primary px-3.5 text-[13px] font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Patient
          </button>
        )}
      </div>

      {/* Opt-out filter banner */}
      {filterOptOut && (
        <div className="mb-4 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-[13px] text-amber-700">
          <span>Showing patients who have opted out of WhatsApp messages.</span>
          <a href="/patients" className="font-medium underline-offset-4 hover:underline">Clear filter</a>
        </div>
      )}

      {/* Inline new patient form */}
      {showNewForm && (
        <div className="mb-4 flex items-end gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Name *</label>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Patient full name"
                className="h-8 w-full rounded-md border border-border bg-background pl-9 pr-3 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Phone *</label>
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
              </svg>
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile"
                className="h-8 w-full rounded-md border border-border bg-background pl-9 pr-3 text-[13px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <button
            onClick={() => { void handleCreatePatient(false) }}
            disabled={creating || !newName.trim() || !/^[6-9]\d{9}$/.test(newPhone)}
            className="h-8 rounded-md bg-primary px-3 text-[12px] font-medium text-white disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
          <button
            onClick={() => { setShowNewForm(false); setNewName(''); setNewPhone('') }}
            className="h-8 rounded-md border border-border px-3 text-[12px] text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {searching ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <PatientDirectoryTable
            patients={displayedPatients}
            query={isSearching ? query : undefined}
            emptyState={
              isSearching ? (
                <div>
                  <p className="text-[13px] text-muted-foreground">No patients found for &ldquo;{query}&rdquo;.</p>
                  <button
                    onClick={() => setShowNewForm(true)}
                    className="mt-2 text-[13px] font-medium text-primary hover:underline"
                  >
                    + Add New Patient
                  </button>
                </div>
              ) : undefined
            }
          />
        )}

        {/* Pagination (non-search mode) */}
        {!isSearching && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <div className="text-[12px] text-muted-foreground">
              Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} patients
            </div>
            <div className="flex items-center gap-1.5">
              <Link
                href={`/patients?page=${pagination.page - 1}`}
                className={`flex h-[30px] w-[30px] items-center justify-center rounded-md border border-border text-[13px] font-medium ${pagination.page <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-muted'}`}
              >
                ←
              </Link>
              <span className="flex h-[30px] min-w-[30px] items-center justify-center rounded-md bg-primary px-2 text-[13px] font-medium text-white">
                {pagination.page}
              </span>
              <Link
                href={`/patients?page=${pagination.page + 1}`}
                className={`flex h-[30px] w-[30px] items-center justify-center rounded-md border border-border text-[13px] font-medium ${pagination.page >= pagination.totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-muted'}`}
              >
                →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
