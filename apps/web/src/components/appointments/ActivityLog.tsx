'use client'

import * as React from 'react'

interface AuditEntry {
  id: string
  action: string
  actor_id: string
  actor_role: string
  resource_type: string
  resource_id: string | null
  metadata: unknown
  created_at: string
}

interface ActivityLogProps {
  clinicId: string
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    reschedule: 'Rescheduled appointment',
    cancel: 'Cancelled appointment',
    'mark-complete': 'Marked complete',
    'mark-no-show': 'Marked no-show',
    'slot-block': 'Blocked slot',
    'slot-unblock': 'Unblocked slot',
    CREATE_APPOINTMENT: 'Created appointment',
    MODIFY_APPOINTMENT: 'Modified appointment',
    CANCEL_APPOINTMENT: 'Cancelled appointment',
  }
  return labels[action] ?? action
}

function formatDateTime(dt: string): string {
  try {
    return new Date(dt).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dt
  }
}

/**
 * Activity Log table for Settings → Activity Log (Story 5.4).
 * Read-only, paginated, filterable by action type and date range.
 */
export function ActivityLog({ clinicId }: ActivityLogProps) {
  const [entries, setEntries] = React.useState<AuditEntry[]>([])
  const [loading, setLoading] = React.useState(false)
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [actionFilter, setActionFilter] = React.useState('')
  const [startDate, setStartDate] = React.useState('')
  const [endDate, setEndDate] = React.useState('')

  const fetchLog = React.useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (actionFilter) params.set('action', actionFilter)
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    try {
      const res = await fetch(`/api/v1/activity-log?${params}`)
      if (res.ok) {
        const data = (await res.json()) as {
          entries: AuditEntry[]
          totalPages: number
        }
        setEntries(data.entries)
        setTotalPages(data.totalPages)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [page, actionFilter, startDate, endDate])

  React.useEffect(() => {
    void fetchLog()
  }, [fetchLog])

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
          className="h-9 rounded-lg border border-border bg-card px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="From date"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
          className="h-9 rounded-lg border border-border bg-card px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="To date"
        />
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
          className="h-9 rounded-lg border border-border bg-card px-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">All Actions</option>
          <option value="reschedule">Reschedule</option>
          <option value="cancel">Cancel</option>
          <option value="mark-complete">Mark Complete</option>
          <option value="mark-no-show">Mark No-Show</option>
          <option value="slot-block">Block Slot</option>
          <option value="slot-unblock">Unblock Slot</option>
          <option value="CREATE_APPOINTMENT">Create Appointment</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-[13px]">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Time (IST)</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Actor Role</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No activity log entries found.</td></tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDateTime(entry.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{actionLabel(entry.action)}</td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">{entry.actor_role.toLowerCase()}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.metadata ? (
                      <span className="text-[11px]">
                        {JSON.stringify(entry.metadata).slice(0, 80)}
                        {JSON.stringify(entry.metadata).length > 80 ? '…' : ''}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="h-8 px-3 rounded-lg border border-border text-[12px] font-medium disabled:opacity-50 hover:bg-muted transition-colors"
          >
            ← Prev
          </button>
          <span className="text-[12px] text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="h-8 px-3 rounded-lg border border-border text-[12px] font-medium disabled:opacity-50 hover:bg-muted transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
