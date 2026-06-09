'use client'

import { useState, useEffect, useRef } from 'react'

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
  const [exportReady, setExportReady] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fromDate = new Date(from)
  const toDate = new Date(to)
  const rangeDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24))
  const isAsync = rangeDays > 90

  // Poll for async job completion
  useEffect(() => {
    if (!asyncJobId) return

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/v1/reports/export/${asyncJobId}`, { method: 'HEAD' })
        if (res.ok) {
          clearInterval(pollRef.current!)
          pollRef.current = null
          setExportReady(true)
        } else if (res.status === 422) {
          // failed
          clearInterval(pollRef.current!)
          pollRef.current = null
          setExportError('Export failed. Please try again.')
        }
        // 202 = still processing, keep polling
      } catch {
        // network error — keep polling
      }
    }, 8000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [asyncJobId])

  async function handleExport() {
    setLoading(true)
    setExportError(null)
    try {
      const res = await fetch('/api/v1/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType, from, to, doctorId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? 'Export failed')
      }

      if (isAsync) {
        const data = await res.json() as { async: boolean; jobId: string }
        setAsyncJobId(data.jobId)
        setExportReady(false)
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
      const msg = e instanceof Error ? e.message : 'Export failed'
      setExportError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleDownloadReady() {
    if (!asyncJobId) return
    const a = document.createElement('a')
    a.href = `/api/v1/reports/export/${asyncJobId}`
    a.download = `${reportType}-${from}-${to}.csv`
    a.click()
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
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
        {exportError && (
          <p className="text-xs text-red-600">{exportError}</p>
        )}
      </div>

      {/* Async export ready banner — shown after modal is dismissed */}
      {exportReady && !showModal && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-white border border-[var(--color-border)] rounded-xl shadow-xl px-4 py-3 max-w-xs">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-green-600 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text)]">Your export is ready.</p>
            <button
              onClick={handleDownloadReady}
              className="text-xs text-[var(--color-primary)] font-semibold hover:underline"
            >
              Download
            </button>
          </div>
          <button
            onClick={() => setExportReady(false)}
            className="text-[var(--color-text-3)] hover:text-[var(--color-text)] ml-1"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      )}

      {/* Async export modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-semibold text-[var(--color-text)] mb-2">Preparing your export</h2>
            {exportReady ? (
              <>
                <p className="text-sm text-[var(--color-text-2)] mb-5 leading-relaxed">
                  Your export is ready to download.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { handleDownloadReady(); setShowModal(false) }}
                    className="flex-1 h-11 bg-[var(--color-primary)] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="h-11 px-4 border border-[var(--color-border)] text-[var(--color-text-2)] font-medium rounded-lg hover:bg-[var(--color-bg)] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
