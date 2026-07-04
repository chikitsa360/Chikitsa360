'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts'

interface DoctorUtilisation {
  doctorId: string
  doctorName: string
  availableSlots: number
  usedSlots: number
  utilisationPct: string | null
}

interface DoctorUtilisationTableProps {
  byDoctor: DoctorUtilisation[]
  clinicAvgPct: string
}

function utilisationColor(pct: number): string {
  if (pct >= 80) return '#10B981'
  if (pct >= 50) return '#0A6EFF'
  if (pct >= 30) return '#F59E0B'
  return '#EF4444'
}

function utilisationBadge(pct: number): string {
  if (pct >= 80) return 'text-emerald-700 bg-emerald-50'
  if (pct >= 50) return 'text-blue-700 bg-blue-50'
  if (pct >= 30) return 'text-amber-700 bg-amber-50'
  return 'text-red-700 bg-red-50'
}

export default function DoctorUtilisationTable({ byDoctor, clinicAvgPct }: DoctorUtilisationTableProps) {
  if (byDoctor.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No doctor data for this period.</p>
  }

  const clinicAvg = parseFloat(clinicAvgPct)
  const chartData = byDoctor.map((d) => ({
    name: d.doctorName.replace(/^Dr\.\s*/i, 'Dr. '),
    pct: d.utilisationPct != null ? parseFloat(d.utilisationPct) : 0,
    used: d.usedSlots,
    available: d.availableSlots,
  }))

  return (
    <div>
      {/* Clinic average badge */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${utilisationBadge(clinicAvg)}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M3 3v18h18" />
              <path d="M18 9l-5 5-3-3-4 4" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Clinic Average</p>
            <p className={`text-lg font-bold ${clinicAvg >= 70 ? 'text-emerald-600' : clinicAvg >= 40 ? 'text-foreground' : 'text-amber-600'}`}>
              {clinicAvgPct}%
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground italic ml-auto">
          Based on current working hours
        </p>
      </div>

      {/* Horizontal bar chart */}
      <div className="mb-5 rounded-lg border border-border bg-card p-4">
        <ResponsiveContainer width="100%" height={Math.max(140, byDoctor.length * 52 + 24)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 48, left: 0, bottom: 4 }}
          >
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 12, fill: 'var(--color-text-2)', fontFamily: 'Inter, sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: '#fff',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 13,
                boxShadow: '0 4px 12px rgba(0,0,0,.08)',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, _name: any, item: any) => {
                const payload = item?.payload as { used?: number; available?: number } | undefined
                return [
                  `${value}% (${payload?.used ?? 0}/${payload?.available ?? 0} slots)`,
                  'Utilisation',
                ]
              }}
            />
            <ReferenceLine x={clinicAvg} stroke="#94A3B8" strokeDasharray="4 4" strokeWidth={1.5} />
            <Bar dataKey="pct" radius={[0, 6, 6, 0]} maxBarSize={28} minPointSize={2}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={utilisationColor(entry.pct)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 pl-[130px]">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <div className="w-6 h-0 border-t-2 border-dashed border-muted-foreground/50" />
            Clinic avg ({clinicAvgPct}%)
          </div>
        </div>
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {['Doctor', 'Available', 'Used', 'Utilisation'].map((h) => (
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
              const pct = row.utilisationPct != null ? parseFloat(row.utilisationPct) : null
              const badgeCls = pct != null ? utilisationBadge(pct) : 'text-muted-foreground bg-muted'
              const barColor = pct != null ? utilisationColor(pct) : '#E2E8F0'
              return (
                <tr key={row.doctorId} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2.5 px-3 font-semibold border-b border-border">{row.doctorName}</td>
                  <td className="py-2.5 px-3 text-muted-foreground border-b border-border">{row.availableSlots}</td>
                  <td className="py-2.5 px-3 text-muted-foreground border-b border-border">{row.usedSlots}</td>
                  <td className="py-2.5 px-3 border-b border-border">
                    {pct != null ? (
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 max-w-[100px]">
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${Math.min(pct, 100)}%`, background: barColor }}
                            />
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badgeCls}`}>
                          {row.utilisationPct}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">&mdash;</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
