'use client'

import * as React from 'react'
import { useToast } from '@/components/ui/ToastProvider'

interface DataExportSectionProps {
  clinicId: string
  lastExportUrl: string | null
  lastExportExpiresAt: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function DataExportSection({ clinicId, lastExportUrl, lastExportExpiresAt }: DataExportSectionProps) {
  const { addToast } = useToast()
  const [confirming, setConfirming] = React.useState(false)
  const [exporting, setExporting] = React.useState(false)

  const exportExpired = lastExportExpiresAt ? new Date(lastExportExpiresAt) < new Date() : true
  const hasValidExport = !!lastExportUrl && !exportExpired
  const lastExportDate = lastExportExpiresAt
    ? formatDate(lastExportExpiresAt)
    : null

  async function startExport() {
    setExporting(true)
    try {
      const res = await fetch(`/api/v1/clinics/${clinicId}/export`, { method: 'POST' })
      if (!res.ok) throw new Error('Export failed')
      setConfirming(false)
      addToast({ variant: 'success', message: "We'll prepare your data export. Check back shortly for the download link." })
    } catch {
      addToast({ variant: 'error', message: 'Export failed. Please try again.' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-[15px] font-semibold text-foreground">Clinic Data Export</h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Export all your clinic data as CSV files (patients, appointments, billing). Your data is yours.
      </p>

      {/* Last export status */}
      {lastExportDate && (
        <p className="mt-3 text-[12px] text-muted-foreground">
          Last exported: {lastExportDate}.{' '}
          {hasValidExport ? (
            <a href={lastExportUrl!} className="font-medium text-primary hover:underline">
              Download again
            </a>
          ) : (
            <span className="text-muted-foreground">Link expired — request a new export below.</span>
          )}
        </p>
      )}

      <div className="mt-4">
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground hover:bg-muted"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export All Data
          </button>
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-[13px] text-foreground">
              We&apos;ll prepare your data export and send you a download link. This may take a few minutes.
            </p>
            <div className="mt-3 flex gap-2.5">
              <button
                onClick={startExport}
                disabled={exporting}
                className="rounded-md bg-primary px-4 py-1.5 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {exporting ? 'Starting…' : 'Start Export'}
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={exporting}
                className="rounded-md border border-border bg-background px-4 py-1.5 text-[13px] font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
