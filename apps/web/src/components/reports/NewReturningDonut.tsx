'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface NewReturningDonutProps {
  newPatients: number
  returningPatients: number
  totalUnique: number
  newPct: string
  returningPct: string
}

export default function NewReturningDonut({
  newPatients,
  returningPatients,
  totalUnique,
  newPct,
  returningPct,
}: NewReturningDonutProps) {
  const isEmpty = totalUnique === 0

  const data = isEmpty
    ? [{ name: 'No data', value: 1 }]
    : [
        { name: 'New', value: newPatients },
        { name: 'Returning', value: returningPatients },
      ]

  const colors = isEmpty ? ['#E2E8F0'] : ['var(--color-primary)', '#00B8A9']

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0" style={{ width: 140, height: 140 }}>
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={data}
              cx={65}
              cy={65}
              innerRadius={46}
              outerRadius={65}
              dataKey="value"
              strokeWidth={0}
              startAngle={90}
              endAngle={-270}
            >
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index] ?? '#E2E8F0'} />
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
        {/* Centre label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-[var(--color-text)]">{totalUnique}</span>
          <span className="text-[10px] text-[var(--color-text-3)] text-center leading-tight">patients<br/>seen</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {isEmpty ? (
          <p className="text-sm text-[var(--color-text-3)]">No patient data yet.</p>
        ) : (
          <>
            <LegendItem color="var(--color-primary)" label="New" count={newPatients} pct={newPct} />
            <LegendItem color="#00B8A9" label="Returning" count={returningPatients} pct={returningPct} />
          </>
        )}
      </div>
    </div>
  )
}

function LegendItem({
  color,
  label,
  count,
  pct,
}: {
  color: string
  label: string
  count: number
  pct: string
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
      <span className="text-sm text-[var(--color-text-2)] w-20">{label}</span>
      <span className="text-sm font-bold text-[var(--color-text)]">{count}</span>
      <span className="text-xs text-[var(--color-text-3)]">({pct}%)</span>
    </div>
  )
}
