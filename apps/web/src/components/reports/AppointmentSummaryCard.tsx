'use client'

interface AppointmentSummary {
  total: number
  completed: number
  cancelled: number
  noShows: number
  completedPct: string
  cancelledPct: string
  noShowPct: string
}

interface ByDoctor {
  doctorId: string
  doctorName: string
  total: number
  completed: number
  cancelled: number
  noShows: number
  noShowPct: string
}

interface AppointmentSummaryCardProps {
  summary: AppointmentSummary
  byDoctor: ByDoctor[]
  doctorFiltered: boolean
}

export default function AppointmentSummaryCard({
  summary,
  byDoctor,
  doctorFiltered,
}: AppointmentSummaryCardProps) {
  const noShowHigh = parseFloat(summary.noShowPct) > 10

  return (
    <div>
      {/* Stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Appointments" value={summary.total.toString()} />
        <StatCard label="Completed" value={summary.completed.toString()} sub={`${summary.completedPct}% of total`} />
        <StatCard label="Cancelled" value={summary.cancelled.toString()} sub={`${summary.cancelledPct}% of total`} />
        <StatCard
          label="No-Shows"
          value={summary.noShows.toString()}
          sub={`${summary.noShowPct}% of total`}
          highlight={noShowHigh}
        />
      </div>

      {/* Per-doctor table — hidden when doctor filter active */}
      {!doctorFiltered && byDoctor.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['Doctor', 'Total', 'Completed', 'Cancelled', 'No-Shows', 'No-Show %'].map((h) => (
                  <th
                    key={h}
                    className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-3)] bg-[var(--color-bg)] border-b border-[var(--color-border)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byDoctor.map((row) => {
                const ns = parseFloat(row.noShowPct) > 15
                return (
                  <tr key={row.doctorId} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-medium border-b border-[var(--color-border)]">{row.doctorName}</td>
                    <td className="py-2.5 px-3 border-b border-[var(--color-border)]">{row.total}</td>
                    <td className="py-2.5 px-3 border-b border-[var(--color-border)]">{row.completed}</td>
                    <td className="py-2.5 px-3 border-b border-[var(--color-border)]">{row.cancelled}</td>
                    <td className="py-2.5 px-3 border-b border-[var(--color-border)]">{row.noShows}</td>
                    <td className={`py-2.5 px-3 font-semibold border-b border-[var(--color-border)] ${ns ? 'text-amber-600' : ''}`}>
                      {row.noShowPct}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!doctorFiltered && byDoctor.length === 0 && (
        <p className="text-sm text-[var(--color-text-3)] text-center py-4">No appointment data for this period.</p>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`bg-white border rounded-xl p-4 ${
        highlight
          ? 'border-amber-400 border-l-[3px] border-l-amber-400'
          : 'border-[var(--color-border)]'
      }`}
    >
      <p className="text-xs text-[var(--color-text-3)] font-medium">{label}</p>
      <p
        className={`text-2xl font-bold mt-1 font-display ${
          highlight ? 'text-amber-600' : 'text-[var(--color-text)]'
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--color-text-3)] mt-1">{sub}</p>}
    </div>
  )
}
