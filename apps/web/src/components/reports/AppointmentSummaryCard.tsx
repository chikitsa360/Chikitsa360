'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

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

const STATUS_COLORS = {
  completed: '#10B981',
  cancelled: '#EF4444',
  noShow: '#F59E0B',
  empty: '#E2E8F0',
}

export default function AppointmentSummaryCard({
  summary,
  byDoctor,
  doctorFiltered,
}: AppointmentSummaryCardProps) {
  const noShowHigh = parseFloat(summary.noShowPct) > 10
  const isEmpty = summary.total === 0

  const donutData = isEmpty
    ? [{ name: 'No data', value: 1 }]
    : [
        { name: 'Completed', value: summary.completed },
        { name: 'Cancelled', value: summary.cancelled },
        { name: 'No-Shows', value: summary.noShows },
      ]

  const donutColors = isEmpty
    ? [STATUS_COLORS.empty]
    : [STATUS_COLORS.completed, STATUS_COLORS.cancelled, STATUS_COLORS.noShow]

  return (
    <div>
      {/* KPI row + donut chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* KPI cards */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard
            label="Total"
            value={summary.total.toString()}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            }
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <KpiCard
            label="Completed"
            value={summary.completed.toString()}
            sub={`${summary.completedPct}%`}
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
            label="Cancelled"
            value={summary.cancelled.toString()}
            sub={`${summary.cancelledPct}%`}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
              </svg>
            }
            iconBg="bg-red-50"
            iconColor="text-red-500"
            accentColor="border-l-red-400"
          />
          <KpiCard
            label="No-Shows"
            value={summary.noShows.toString()}
            sub={`${summary.noShowPct}%`}
            highlight={noShowHigh}
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
        </div>

        {/* Status donut */}
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
          <div className="relative flex-shrink-0" style={{ width: 110, height: 110 }}>
            <ResponsiveContainer width={110} height={110}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx={50}
                  cy={50}
                  innerRadius={34}
                  outerRadius={50}
                  dataKey="value"
                  strokeWidth={0}
                  startAngle={90}
                  endAngle={-270}
                >
                  {donutData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={donutColors[index] ?? STATUS_COLORS.empty} />
                  ))}
                </Pie>
                {!isEmpty && (
                  <Tooltip
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid var(--color-border)',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                    formatter={(value, name) => [`${value}`, `${name}`]}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-bold text-foreground">{summary.total}</span>
              <span className="text-[9px] text-muted-foreground">total</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <DonutLegend color={STATUS_COLORS.completed} label="Completed" value={summary.completed} pct={summary.completedPct} />
            <DonutLegend color={STATUS_COLORS.cancelled} label="Cancelled" value={summary.cancelled} pct={summary.cancelledPct} />
            <DonutLegend color={STATUS_COLORS.noShow} label="No-Shows" value={summary.noShows} pct={summary.noShowPct} />
          </div>
        </div>
      </div>

      {/* Per-doctor table */}
      {!doctorFiltered && byDoctor.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {['Doctor', 'Total', 'Completed', 'Cancelled', 'No-Shows', 'No-Show %'].map((h) => (
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
              {byDoctor.map((row) => {
                const ns = parseFloat(row.noShowPct) > 15
                return (
                  <tr key={row.doctorId} className="hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium border-b border-border">{row.doctorName}</td>
                    <td className="py-2.5 px-3 border-b border-border text-muted-foreground">{row.total}</td>
                    <td className="py-2.5 px-3 border-b border-border text-muted-foreground">{row.completed}</td>
                    <td className="py-2.5 px-3 border-b border-border text-muted-foreground">{row.cancelled}</td>
                    <td className="py-2.5 px-3 border-b border-border text-muted-foreground">{row.noShows}</td>
                    <td className={`py-2.5 px-3 font-semibold border-b border-border ${ns ? 'text-amber-600' : ''}`}>
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
        <p className="text-sm text-muted-foreground text-center py-4">No appointment data for this period.</p>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  highlight,
  icon,
  iconBg,
  iconColor,
  accentColor,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
  icon: React.ReactNode
  iconBg: string
  iconColor: string
  accentColor?: string
}) {
  return (
    <div
      className={`rounded-xl border bg-card p-4 border-l-[3px] ${
        highlight
          ? 'border-amber-400 border-l-amber-400'
          : accentColor
            ? `border-border ${accentColor}`
            : 'border-border border-l-border'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      </div>
      <p
        className={`text-2xl font-bold font-display ${
          highlight ? 'text-amber-600' : 'text-foreground'
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub} of total</p>}
    </div>
  )
}

function DonutLegend({
  color,
  label,
  value,
  pct,
}: {
  color: string
  label: string
  value: number
  pct: string
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-xs text-muted-foreground w-16">{label}</span>
      <span className="text-xs font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground">({pct}%)</span>
    </div>
  )
}
