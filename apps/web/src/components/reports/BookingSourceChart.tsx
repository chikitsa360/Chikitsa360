'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'

interface SourceData {
  source: string
  count: number
  pct: string
}

const SOURCE_COLORS: Record<string, string> = {
  whatsapp: '#10B981',
  web: '#0A6EFF',
  'walk-in': '#F59E0B',
  'walk-in-overflow': '#F59E0B',
  portal: '#64748B',
  manual: '#94A3B8',
}

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  web: 'Web Booking',
  'walk-in': 'Walk-in',
  'walk-in-overflow': 'Walk-in (Overflow)',
  portal: 'Portal',
  manual: 'Manual',
}

function getColor(source: string): string {
  return SOURCE_COLORS[source] ?? '#94A3B8'
}

function getLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source
}

interface BookingSourceChartProps {
  sources: SourceData[]
}

export default function BookingSourceChart({ sources }: BookingSourceChartProps) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-[var(--color-text-3)] text-center py-8">
        No appointment data for this period.
      </p>
    )
  }

  const data = sources.map((s) => ({
    name: getLabel(s.source),
    count: s.count,
    pct: s.pct,
    color: getColor(s.source),
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 48 + 32)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 64, left: 0, bottom: 4 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
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
          formatter={(value: any, _name: any, item: any) => [
            `${value} appointments (${(item?.payload as { pct?: string } | undefined)?.pct ?? '0'}%)`,
            'Count',
          ]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
          <LabelList
            dataKey="pct"
            position="right"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => `${v}%`}
            style={{ fontSize: 12, fill: 'var(--color-text-2)', fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
