'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface GrowthPoint {
  period: string
  newPatients: number
}

interface PatientGrowthChartProps {
  data: GrowthPoint[]
  groupedByMonth: boolean
}

function formatPeriod(dateStr: string, groupedByMonth: boolean): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  if (groupedByMonth) {
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' })
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

export default function PatientGrowthChart({ data, groupedByMonth }: PatientGrowthChartProps) {
  const chartData = data.map((d) => ({
    label: formatPeriod(d.period, groupedByMonth),
    newPatients: d.newPatients,
  }))

  const groupLabel = groupedByMonth ? 'Showing monthly data' : 'Showing weekly data'

  return (
    <div>
      <p className="text-xs text-[var(--color-text-3)] mb-3">{groupLabel}</p>
      {chartData.length === 0 ? (
        <p className="text-sm text-[var(--color-text-3)] text-center py-8">No patient growth data for this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--color-text-3)', fontFamily: 'Inter, sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: 'var(--color-text-3)', fontFamily: 'Inter, sans-serif' }}
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
              formatter={(value) => [`${value}`, 'New Patients']}
            />
            <Bar dataKey="newPatients" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={48} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
