'use client'

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'

interface RevenuePoint {
  period: string
  revenue: number
  paidCount: number
}

interface RevenueByDayChartProps {
  data: RevenuePoint[]
  groupedByWeek: boolean
}

function formatPeriod(dateStr: string, groupedByWeek: boolean): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  if (groupedByWeek) {
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  }
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

function formatINR(n: number): string {
  return '₹' + n.toLocaleString('en-IN')
}

export default function RevenueByDayChart({ data, groupedByWeek }: RevenueByDayChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatPeriod(d.period, groupedByWeek),
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.12} />
            <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--color-text-3)', fontFamily: 'Inter, sans-serif' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
          tick={{ fontSize: 11, fill: 'var(--color-text-3)', fontFamily: 'Inter, sans-serif' }}
          axisLine={false}
          tickLine={false}
          width={48}
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
            `${formatINR(Number(value))} (${(item?.payload as RevenuePoint | undefined)?.paidCount ?? 0} paid)`,
            groupedByWeek ? 'Week Revenue' : 'Revenue',
          ]}
          labelStyle={{ fontWeight: 600, marginBottom: 4 }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-primary)"
          strokeWidth={2}
          fill="url(#revenueGrad)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
