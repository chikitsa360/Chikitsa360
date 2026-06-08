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

interface TrendPoint {
  day: string
  count: number
}

interface NoShowTrendChartProps {
  trend: TrendPoint[]
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' })
}

export default function NoShowTrendChart({ trend }: NoShowTrendChartProps) {
  const data = trend.map((t) => ({ day: formatDay(t.day), count: t.count }))
  const allZero = data.every((d) => d.count === 0)

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="day"
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
            formatter={(value) => [`${value}`, 'No-shows']}
            labelFormatter={(label) => label}
          />
          <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>

      {allZero && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-[var(--color-text-3)] bg-white px-3 py-1.5 rounded-lg border border-[var(--color-border)]">
            No no-shows in the last 7 days.
          </p>
        </div>
      )}
    </div>
  )
}
