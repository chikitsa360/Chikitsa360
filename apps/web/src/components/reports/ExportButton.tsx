'use client'

import { useState } from 'react'

type ReportType = 'appointments' | 'revenue' | 'patients'

interface ExportButtonProps {
  reportType: ReportType
  from: string
  to: string
  doctorId: string | null
}

export default function ExportButton({ reportType, from, to, doctorId }: ExportButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [asyncJobId, setAsyncJobId] = useState<string | null>(null)

  const fromDate = new Date(from)
  const toDate = new Date(to)
  const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
  const isAsync = rangeDays > 90

  async function handleExport() {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, from, to, doctorId }),
      })

      if (!res.ok) {
        const err = await res.json() as { error?: string }
        throw new Error(err.error ?? 'Export failed')
      }

      if (isAsync) {
        const data = await res.json() as { async: boolean; jobId: string }
        setAsyncJobId(data.jobId)
        setShowModal(true)
      } else {
        // Sync: download the CSV blob
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        const cd = res.headers.get('Content-Disposition') ?? ''
        const match = cd.match(/filename="([^"]+)"/)
        a.download = match?.[1] ?? `${reportType}-${from}-${to}.csv`
        a.href = url
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error('Export failed:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-2 h-9 px-3 text-sm font-medium border border-[var(--color-border)] bg-white text-[var(--color-text-2)] rounded-lg hover:bg-[var(--color-bg)] disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <svg className="animate-spin" width="13" height="13" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="4"/>
            <path fill="currentColor" fillOpacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : (
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        )}
        Export CSV
      </button>

      {/* Async export modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">Preparing your export</h2>
            <p className="text-sm text-[var(--color-text-2)] mb-5 leading-relaxed">
              Your export is being prepared. We&apos;ll notify you when it&apos;s ready to download.
              {asyncJobId && (
                <span className="block mt-1 text-xs text-[var(--color-text-3)]">Job ID: {asyncJobId}</span>
              )}
            </p>
            <button
              onClick={() => setShowModal(false)}
              className="w-full h-11 bg-[var(--color-primary)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  )
}
