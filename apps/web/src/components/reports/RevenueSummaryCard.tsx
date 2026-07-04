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
  revenueUnavailable?: boolean
}

function formatINR(n: number): string {
  return '\u20B9' + n.toLocaleString('en-IN')
}

export default function RevenueSummaryCard({ summary, byDoctor, doctorFiltered, revenueUnavailable }: RevenueSummaryCardProps) {
  if (revenueUnavailable) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-1">
          <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
          </svg>
        </div>
        <p className="text-sm font-medium text-foreground">Revenue data is not available.</p>
        <p className="text-xs text-muted-foreground max-w-xs">Record consultation fees and payment status on appointments to see revenue reports.</p>
      </div>
    )
  }

  const topDoctor = byDoctor.length > 0 ? byDoctor[0] : null

  return (
    <div>
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <KpiCard
          label="Total Revenue"
          value={formatINR(summary.totalRevenue)}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          accentColor="border-l-blue-400"
        />
        <KpiCard
          label="Paid Appointments"
          value={summary.paidCount.toString()}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          }
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          accentColor="border-l-emerald-400"
        />
        <KpiCard
          label="Outstanding"
          value={summary.totalPending.toString()}
          sub="unpaid with fee set"
          warn={summary.totalPending > 0}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
          }
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
          accentColor="border-l-amber-400"
        />
        <KpiCard
          label="Avg per Consultation"
          value={summary.avgFee != null ? formatINR(summary.avgFee) : '\u2014'}
          sub={summary.avgFee == null ? 'No paid appointments' : undefined}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M3 3v18h18" />
              <path d="M18 9l-5 5-3-3-4 4" />
            </svg>
          }
          iconBg="bg-purple-50"
          iconColor="text-purple-600"
          accentColor="border-l-purple-400"
        />
      </div>

      {/* Per-doctor table */}
      {!doctorFiltered && byDoctor.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['#', 'Doctor', 'Appts Paid', 'Revenue', 'Avg Fee'].map((h) => (
                  <th
                    key={h}
                    className="py-2.5 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/50 border-b border-border"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {byDoctor.map((row, idx) => (
                <tr key={row.doctorId} className="hover:bg-muted/30 transition-colors">
                  <td className={`py-2.5 px-3 font-bold border-b border-border w-8 ${idx < 2 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                    {idx + 1}
                  </td>
                  <td className="py-2.5 px-3 font-semibold border-b border-border">
                    <div className="flex items-center gap-2">
                      {row.doctorName}
                      {topDoctor && row.doctorId === topDoctor.doctorId && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          Top
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground border-b border-border">{row.paidCount}</td>
                  <td className="py-2.5 px-3 font-bold border-b border-border">{formatINR(row.totalRevenue)}</td>
                  <td className="py-2.5 px-3 text-muted-foreground border-b border-border">
                    {row.avgFee != null ? formatINR(row.avgFee) : '\u2014'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!doctorFiltered && byDoctor.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No payments recorded for this period.</p>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  warn,
  icon,
  iconBg,
  iconColor,
  accentColor,
}: {
  label: string
  value: string
  sub?: string
  warn?: boolean
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  accentColor?: string
}) {
  return (
    <div className={`rounded-xl border bg-card p-4 border-l-[3px] ${accentColor ?? 'border-l-border'} border-border`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-2xl font-bold font-display ${warn ? 'text-amber-500' : 'text-foreground'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}
