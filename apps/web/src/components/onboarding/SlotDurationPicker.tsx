'use client'

import * as React from 'react'
import { computeSlotCount } from '@/lib/slots'

const DURATIONS = [15, 20, 30, 60]

interface SlotDurationPickerProps {
  value: number
  onChange: (value: number) => void
  startTime?: string
  endTime?: string
  lunchStart?: string
  lunchEnd?: string
}

export function SlotDurationPicker({
  value,
  onChange,
  startTime = '10:00',
  endTime = '19:00',
  lunchStart,
  lunchEnd,
}: SlotDurationPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {DURATIONS.map((d) => {
        const count = computeSlotCount(startTime, endTime, d, lunchStart, lunchEnd)
        const selected = value === d
        return (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            className="flex flex-col items-center rounded-xl border-2 px-3 py-3 text-center transition-all"
            style={
              selected
                ? {
                    borderColor: '#0A6EFF',
                    background: 'rgba(10,110,255,0.06)',
                  }
                : {
                    borderColor: 'var(--color-border)',
                    background: 'var(--color-card)',
                  }
            }
          >
            <span
              className="text-[16px] font-bold"
              style={{ color: selected ? '#0A6EFF' : 'var(--color-foreground)' }}
            >
              {d} min
            </span>
            <span
              className="mt-1 text-[11px] font-medium leading-tight"
              style={{ color: selected ? '#0A6EFF' : 'var(--color-muted-foreground)' }}
            >
              ~{count} patients/day
            </span>
          </button>
        )
      })}
    </div>
  )
}
