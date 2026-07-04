'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
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

function getBarColor(count: number, max: number): string {
  if (count === 0) return '#E2E8F0'
  if (count >= max * 0.8) return '#EF4444'
  if (count >= max * 0.5) return '#F59E0B'
  return '#FBBF24'
}

export default function NoShowTrendChart({ trend }: NoShowTrendChartProps) {
  const data = trend.map((t) => ({ day: formatDay(t.day), count: t.count }))
  const allZero = data.every((d) => d.count === 0)
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  return (
    <div className="relative">
      {!allZero && (
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-amber-400" />
            Low
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            Medium
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            High
          </div>
        </div>
      )}

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
            labelFormatter={(label) => `${label}`}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.count, maxCount)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {allZero && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-card px-4 py-2.5 rounded-lg border border-border shadow-sm">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-foreground font-medium">No no-shows in the last 7 days</p>
          </div>
        </div>
      )}
    </div>
  )
}
