'use client'

interface RevenueSummary {
  totalRevenue: number
  totalPending: number
  paidCount: number
  avgFee: number | null
}

interface ByDoctor {
  doctorId: string
  doctorName: string
  totalRevenue: number
  paidCount: number
  avgFee: number | null
}

interface RevenueSummaryCardProps {
  summary: RevenueSummary
  byDoctor: ByDoctor[]
  doctorFiltered: boolean
}

function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN')
}

export default function RevenueSummaryCard({ summary, byDoctor, doctorFiltered }: RevenueSummaryCardProps) {
  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiCard label="Total Revenue" value={formatINR(summary.totalRevenue)} />
        <KpiCard label="Paid Appointments" value={summary.paidCount.toString()} />
        <KpiCard
          label="Outstanding"
          value={summary.totalPending.toString()}
          sub="unpaid with fee set"
          warn={summary.totalPending > 0}
        />
        <KpiCard
          label="Avg per Consultation"
          value={summary.avgFee != null ? formatINR(summary.avgFee) : '—'}
          sub={summary.avgFee == null ? 'No paid appointments' : undefined}
        />
      </div>

      {/* Per-doctor table */}
      {!doctorFiltered && byDoctor.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['#', 'Doctor', 'Appts Paid', 'Revenue (INR)', 'Avg Fee (INR)'].map((h) => (
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
              {byDoctor.map((row, idx) => (
                <tr key={row.doctorId} className="hover:bg-slate-50">
                  <td className={`py-2.5 px-3 font-bold border-b border-[var(--color-border)] w-8 ${idx < 2 ? 'text-amber-500' : 'text-[var(--color-text-3)]'}`}>
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-semibold border-b border-[var(--color-border)]">{row.doctorName}</td>
                  <td className="py-2.5 px-3 text-[var(--color-text-2)] border-b border-[var(--color-border)]">{row.paidCount}</td>
                  <td className="py-2.5 px-3 font-bold border-b border-[var(--color-border)]">{formatINR(row.totalRevenue)}</td>
                  <td className="py-2.5 px-3 text-[var(--color-text-3)] border-b border-[var(--color-border)]">
                    {row.avgFee != null ? formatINR(row.avgFee) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!doctorFiltered && byDoctor.length === 0 && (
        <p className="text-sm text-[var(--color-text-3)] text-center py-4">No payments recorded for this period.</p>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  warn,
}: {
  label: string
  value: string
  sub?: string
  warn?: boolean
}) {
  return (
    <div className="bg-white border border-[var(--color-border)] rounded-xl p-4">
      <p className="text-xs text-[var(--color-text-3)] font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 font-display ${warn ? 'text-amber-500' : 'text-[var(--color-text)]'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--color-text-3)] mt-1">{sub}</p>}
    </div>
  )
}
