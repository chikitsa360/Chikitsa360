'use client'

import * as React from 'react'

export const SPECIALITY_OPTIONS = [
  'General Medicine',
  'Dermatology',
  'Dentistry',
  'Orthopaedics',
  'Gynaecology',
  'Paediatrics',
  'Ophthalmology',
  'ENT',
  'Cardiology',
  'Neurology',
  'Psychiatry',
  'Physiotherapy',
]

interface SpecialitySelectorProps {
  value: string          // comma-separated, e.g. "Dermatology,Dentistry"
  onChange: (v: string) => void
  hasError?: boolean
}

function parseValue(value: string): { selected: Set<string>; custom: string } {
  const parts = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []
  const selected = new Set<string>()
  const customParts: string[] = []
  for (const p of parts) {
    if (SPECIALITY_OPTIONS.includes(p)) {
      selected.add(p)
    } else {
      customParts.push(p)
    }
  }
  return { selected, custom: customParts.join(', ') }
}

function buildValue(selected: Set<string>, custom: string): string {
  const customParts = custom
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !SPECIALITY_OPTIONS.includes(s))
  return [...selected, ...customParts].join(',')
}

export function SpecialitySelector({ value, onChange, hasError }: SpecialitySelectorProps) {
  const { selected: initSelected, custom: initCustom } = React.useMemo(
    () => parseValue(value),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )
  const [selected, setSelected] = React.useState<Set<string>>(initSelected)
  const [custom, setCustom] = React.useState(initCustom)
  const [showCustom, setShowCustom] = React.useState(initCustom.length > 0)

  function toggle(option: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(option)) next.delete(option)
      else next.add(option)
      onChange(buildValue(next, custom))
      return next
    })
  }

  function handleCustomChange(v: string) {
    setCustom(v)
    onChange(buildValue(selected, v))
  }

  const borderColor = hasError
    ? 'border-error'
    : 'border-border'

  return (
    <div
      className={`rounded-lg border ${borderColor} bg-white p-3`}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {SPECIALITY_OPTIONS.map((opt) => (
          <label key={opt} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={selected.has(opt)}
              onChange={() => toggle(opt)}
              className="h-3.5 w-3.5 shrink-0 accent-primary"
            />
            <span className="text-[13px] text-foreground">{opt}</span>
          </label>
        ))}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        {!showCustom ? (
          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="text-[12px] font-medium text-primary hover:underline"
          >
            + Add custom speciality
          </button>
        ) : (
          <div>
            <label className="mb-1 block text-[12px] font-medium text-muted-foreground">
              Custom speciality
            </label>
            <input
              type="text"
              value={custom}
              onChange={(e) => handleCustomChange(e.target.value)}
              placeholder="e.g. Cardiothoracic Surgery"
              maxLength={200}
              className="h-9 w-full rounded-md border border-border bg-white px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Separate multiple custom entries with a comma
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
