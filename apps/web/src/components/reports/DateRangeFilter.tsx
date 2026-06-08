'use client'

import { useState } from 'react'

export type DatePreset = 'today' | 'this-week' | 'this-month' | 'last-30' | 'custom'

export interface DateRange {
  from: string // YYYY-MM-DD
  to: string   // YYYY-MM-DD
}

interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
}

function todayIST(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function getPresetRange(preset: DatePreset): DateRange {
  const today = todayIST()
  const now = new Date(today)

  if (preset === 'today') {
    return { from: today, to: today }
  }
  if (preset === 'this-week') {
    const dow = now.getDay()
    const mon = new Date(now)
    mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return {
      from: mon.toISOString().slice(0, 10),
      to: sun.toISOString().slice(0, 10),
    }
  }
  if (preset === 'this-month') {
    const from = today.slice(0, 7) + '-01'
    return { from, to: today }
  }
  if (preset === 'last-30') {
    const from = new Date(now)
    from.setDate(now.getDate() - 29)
    return { from: from.toISOString().slice(0, 10), to: today }
  }
  return { from: today, to: today }
}

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'this-week', label: 'This Week' },
  { key: 'this-month', label: 'This Month' },
  { key: 'last-30', label: 'Last 30 Days' },
  { key: 'custom', label: 'Custom' },
]

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [activePreset, setActivePreset] = useState<DatePreset>('this-month')
  const [showCustom, setShowCustom] = useState(false)
  const [customFrom, setCustomFrom] = useState(value.from)
  const [customTo, setCustomTo] = useState(value.to)
  const [customError, setCustomError] = useState<string | null>(null)

  function selectPreset(preset: DatePreset) {
    setActivePreset(preset)
    if (preset === 'custom') {
      setShowCustom(true)
      return
    }
    setShowCustom(false)
    onChange(getPresetRange(preset))
  }

  function applyCustom() {
    const from = new Date(customFrom)
    const to = new Date(customTo)
    const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
    if (days > 365) {
      setCustomError('Maximum report range is 365 days.')
      return
    }
    if (days < 0) {
      setCustomError('End date must be after start date.')
      return
    }
    setCustomError(null)
    onChange({ from: customFrom, to: customTo })
  }

  const rangeDays = Math.ceil(
    (new Date(value.to).getTime() - new Date(value.from).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => selectPreset(p.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              activePreset === p.key
                ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)]'
                : 'bg-white text-[var(--color-text-2)] border-[var(--color-border)] hover:bg-[var(--color-bg)]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="h-8 px-2 text-xs border border-[var(--color-border)] rounded-lg bg-white text-[var(--color-text)]"
          />
          <span className="text-xs text-[var(--color-text-3)]">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="h-8 px-2 text-xs border border-[var(--color-border)] rounded-lg bg-white text-[var(--color-text)]"
          />
          <button
            onClick={applyCustom}
            className="h-8 px-3 text-xs font-semibold bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
          >
            Apply
          </button>
          {customError && <span className="text-xs text-amber-600">{customError}</span>}
        </div>
      )}

      {rangeDays > 90 && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
          </svg>
          Large date range — report may take a few seconds to load.
        </p>
      )}
    </div>
  )
}

export { getPresetRange }
