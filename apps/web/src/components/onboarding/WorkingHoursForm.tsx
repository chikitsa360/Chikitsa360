'use client'

import * as React from 'react'
import { SlotDurationPicker } from './SlotDurationPicker'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// 0=Mon, 1=Tue, ..., 5=Sat, 6=Sun
const DEFAULT_ACTIVE_DAYS = [0, 1, 2, 3, 4, 5] // Mon–Sat

export interface WorkingHoursData {
  doctorId: string
  activeDays: number[]
  startTime: string
  endTime: string
  slotDuration: number
  lunchEnabled: boolean
  lunchStartTime: string
  lunchEndTime: string
}

interface WorkingHoursFormProps {
  doctorId: string
  initialData?: Partial<WorkingHoursData>
  onChange: (data: WorkingHoursData) => void
  error?: string
}

export function WorkingHoursForm({ doctorId, initialData, onChange, error }: WorkingHoursFormProps) {
  const [activeDays, setActiveDays] = React.useState<number[]>(
    initialData?.activeDays ?? DEFAULT_ACTIVE_DAYS
  )
  const [startTime, setStartTime] = React.useState(initialData?.startTime ?? '10:00')
  const [endTime, setEndTime] = React.useState(initialData?.endTime ?? '19:00')
  const [slotDuration, setSlotDuration] = React.useState(initialData?.slotDuration ?? 20)
  const [lunchEnabled, setLunchEnabled] = React.useState(initialData?.lunchEnabled ?? false)
  const [lunchStartTime, setLunchStartTime] = React.useState(initialData?.lunchStartTime ?? '13:00')
  const [lunchEndTime, setLunchEndTime] = React.useState(initialData?.lunchEndTime ?? '14:00')

  React.useEffect(() => {
    onChange({
      doctorId,
      activeDays,
      startTime,
      endTime,
      slotDuration,
      lunchEnabled,
      lunchStartTime,
      lunchEndTime,
    })
  }, [doctorId, activeDays, startTime, endTime, slotDuration, lunchEnabled, lunchStartTime, lunchEndTime, onChange])

  function toggleDay(day: number) {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  return (
    <div>
      {/* Working days */}
      <div className="mb-5">
        <label className="mb-2 block text-[13px] font-medium text-foreground">Working Days</label>
        <div className="flex gap-2">
          {DAY_LABELS.map((label, idx) => {
            const active = activeDays.includes(idx)
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggleDay(idx)}
                className="flex h-9 min-w-[40px] items-center justify-center rounded-lg px-2 text-[12px] font-semibold transition-colors"
                style={
                  active
                    ? { background: '#0A6EFF', color: '#fff' }
                    : { background: 'var(--color-muted)', color: 'var(--color-muted-foreground)', border: '1px solid var(--color-border)' }
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time range */}
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">Start Time</label>
          <input
            type="time"
            value={startTime}
            step={900}
            onChange={(e) => setStartTime(e.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-card px-3 text-[13px] text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-foreground">End Time</label>
          <input
            type="time"
            value={endTime}
            step={900}
            onChange={(e) => setEndTime(e.target.value)}
            className={`h-11 w-full rounded-lg border bg-card px-3 text-[13px] text-foreground focus:outline-none focus:ring-2 transition-colors ${
              error ? 'border-error focus:ring-error/30 focus:border-error' : 'border-border focus:border-primary focus:ring-primary/30'
            }`}
          />
        </div>
      </div>
      {error && <p className="mb-4 text-[12px] text-error">{error}</p>}

      {/* Slot duration */}
      <div className="mb-5">
        <label className="mb-2 block text-[13px] font-medium text-foreground">Appointment Slot Duration</label>
        <SlotDurationPicker
          value={slotDuration}
          onChange={setSlotDuration}
          startTime={startTime}
          endTime={endTime}
          lunchStart={lunchEnabled ? lunchStartTime : undefined}
          lunchEnd={lunchEnabled ? lunchEndTime : undefined}
        />
      </div>

      {/* Lunch break */}
      <div>
        <label className="mb-2 flex cursor-pointer items-center gap-2.5 text-[13px] font-medium text-foreground">
          <input
            type="checkbox"
            checked={lunchEnabled}
            onChange={(e) => setLunchEnabled(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Lunch Break
        </label>

        {lunchEnabled && (
          <div
            className="mt-2 grid grid-cols-2 gap-4 rounded-lg border border-warning/30 p-4"
            style={{ background: 'rgba(245,158,11,0.05)' }}
          >
            <div>
              <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Lunch Start</label>
              <input
                type="time"
                value={lunchStartTime}
                step={900}
                onChange={(e) => setLunchStartTime(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-muted-foreground">Lunch End</label>
              <input
                type="time"
                value={lunchEndTime}
                step={900}
                onChange={(e) => setLunchEndTime(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-[13px] text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
