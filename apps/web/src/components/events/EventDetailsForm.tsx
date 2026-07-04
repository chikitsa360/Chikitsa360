'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventFormData {
  title: string
  description: string
  date: string        // YYYY-MM-DD
  startTime: string   // HH:mm
  endTime: string     // HH:mm
  registrationDeadline: string
  venue: string
  meetingLink: string
  maxSeats: string    // stored as string for input; converted on submit
  feeRupees: string   // display rupees; convert to paise on submit
  recurrenceEnabled: boolean
  recurrenceType: 'daily' | 'weekly'
  recurrenceDayOfWeek: number | null
  recurrenceOccurrences: string
}

export interface EventFormErrors {
  title?: string
  date?: string
  startTime?: string
  endTime?: string
  maxSeats?: string
  meetingLink?: string
  recurrenceOccurrences?: string
  recurrenceDayOfWeek?: string
}

export interface EventFormProps {
  data: EventFormData
  errors: EventFormErrors
  onChange: (updates: Partial<EventFormData>) => void
  disabled?: boolean
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// ─── Label helpers ────────────────────────────────────────────────────────────

function FieldLabel({ children, required, optional }: { children: React.ReactNode; required?: boolean; optional?: boolean }) {
  return (
    <label className="block text-[12px] font-semibold text-muted-foreground">
      {children}
      {required && <span className="ml-0.5 text-destructive">*</span>}
      {optional && <span className="ml-1 text-[11px] font-normal text-muted-foreground/70">Optional</span>}
    </label>
  )
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-0.5 text-[11px] text-destructive">{msg}</p>
}

// ─── Input classes ────────────────────────────────────────────────────────────

const inputCls = (err?: string) =>
  cn(
    'h-9 w-full rounded-md border bg-card px-3 text-[13px] text-foreground font-medium placeholder:text-muted-foreground/60',
    'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
    err ? 'border-destructive' : 'border-border'
  )

// ─── Recurrence preview ───────────────────────────────────────────────────────

function RecurrencePreview({ type, dayOfWeek, occurrences, maxSeats }: {
  type: 'daily' | 'weekly'
  dayOfWeek: number | null
  occurrences: string
  maxSeats: string
}) {
  const n = parseInt(occurrences, 10)
  const seats = parseInt(maxSeats, 10)
  if (isNaN(n) || n < 2) return null

  const label = type === 'weekly'
    ? `${n} events · ${dayOfWeek !== null ? DAY_FULL[dayOfWeek] : '?'} weekly · ${isNaN(seats) ? '?' : seats} seats each`
    : `${n} events · Daily · ${isNaN(seats) ? '?' : seats} seats each`

  return (
    <div className="rounded-md border border-primary/20 bg-primary/[0.04] px-3 py-2 text-[13px] text-primary font-medium">
      {label}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EventDetailsForm({ data, errors, onChange, disabled }: EventFormProps) {
  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1">
          <FieldLabel required>Event Title</FieldLabel>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
            <input
              type="text"
              className={cn(inputCls(errors.title), 'pl-9')}
              value={data.title}
              onChange={e => onChange({ title: e.target.value })}
              placeholder="e.g. Diabetes Awareness Camp"
              maxLength={120}
              disabled={disabled}
            />
          </div>
          <FieldError msg={errors.title} />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <FieldLabel optional>Description</FieldLabel>
        <textarea
          className={cn(inputCls(), 'h-auto min-h-[72px] resize-y py-2')}
          rows={3}
          value={data.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="Tell patients what to expect at this event…"
          disabled={disabled}
        />
      </div>

      {/* Section: Date & Time */}
      <div className="flex items-center gap-2 pt-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Date &amp; Time</div>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <FieldLabel required>Date</FieldLabel>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            <input
              type="date"
              className={cn(inputCls(errors.date), 'pl-9')}
              value={data.date}
              onChange={e => onChange({ date: e.target.value })}
              disabled={disabled}
            />
          </div>
          <FieldError msg={errors.date} />
        </div>
        <div className="space-y-1">
          <FieldLabel optional>Registration Deadline</FieldLabel>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /><line x1="12" y1="17" x2="12" y2="17.01" /></svg>
            <input
              type="datetime-local"
              className={cn(inputCls(), 'pl-9')}
              value={data.registrationDeadline}
              onChange={e => onChange({ registrationDeadline: e.target.value })}
              disabled={disabled}
            />
          </div>
        </div>
        <div className="space-y-1">
          <FieldLabel required>Start Time</FieldLabel>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            <input
              type="time"
              className={cn(inputCls(errors.startTime), 'pl-9')}
              value={data.startTime}
              onChange={e => onChange({ startTime: e.target.value })}
              disabled={disabled}
            />
          </div>
          <FieldError msg={errors.startTime} />
        </div>
        <div className="space-y-1">
          <FieldLabel required>End Time</FieldLabel>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
            <input
              type="time"
              className={cn(inputCls(errors.endTime), 'pl-9')}
              value={data.endTime}
              onChange={e => onChange({ endTime: e.target.value })}
              disabled={disabled}
            />
          </div>
          <FieldError msg={errors.endTime} />
        </div>
      </div>

      {/* Section: Location & Capacity */}
      <div className="flex items-center gap-2 pt-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">Location &amp; Capacity</div>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <FieldLabel optional>Venue</FieldLabel>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
            <input
              type="text"
              className={cn(inputCls(), 'pl-9')}
              value={data.venue}
              onChange={e => onChange({ venue: e.target.value })}
              placeholder="e.g. Clinic Hall A"
              disabled={disabled}
            />
          </div>
        </div>
        <div className="space-y-1">
          <FieldLabel optional>Meeting Link</FieldLabel>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
            <input
              type="url"
              className={cn(inputCls(errors.meetingLink), 'pl-9')}
              value={data.meetingLink}
              onChange={e => onChange({ meetingLink: e.target.value })}
              placeholder="https://meet.google.com/…"
              disabled={disabled}
            />
          </div>
          <FieldError msg={errors.meetingLink} />
        </div>
        <div className="space-y-1">
          <FieldLabel required>Max Seats</FieldLabel>
          <div className="relative">
            <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <input
              type="number"
              className={cn(inputCls(errors.maxSeats), 'pl-9')}
              value={data.maxSeats}
              onChange={e => onChange({ maxSeats: e.target.value })}
              min={1}
              max={500}
              placeholder="e.g. 30"
              disabled={disabled}
            />
          </div>
          <FieldError msg={errors.maxSeats} />
        </div>
        <div className="space-y-1">
          <FieldLabel optional>Fee (₹)</FieldLabel>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">₹</span>
            <input
              type="number"
              className={cn(inputCls(), 'pl-7')}
              value={data.feeRupees}
              onChange={e => onChange({ feeRupees: e.target.value })}
              min={0}
              placeholder="Leave blank if free"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Recurrence toggle */}
      <div className="flex items-center gap-3 rounded-md bg-muted px-4 py-3">
        <div className="flex-1">
          <div className="text-[13px] font-semibold text-foreground">Recurring Event</div>
          <div className="text-[12px] text-muted-foreground">Schedule multiple sessions at once</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={data.recurrenceEnabled}
          onClick={() => onChange({ recurrenceEnabled: !data.recurrenceEnabled })}
          disabled={disabled}
          className={cn(
            'relative h-6 w-10 rounded-full transition-colors',
            data.recurrenceEnabled ? 'bg-primary' : 'bg-border'
          )}
        >
          <span className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all',
            data.recurrenceEnabled ? 'left-[18px]' : 'left-0.5'
          )} />
        </button>
      </div>

      {/* Recurrence options */}
      {data.recurrenceEnabled && (
        <div className="rounded-md border border-border bg-muted/30 p-4 space-y-4">
          {/* Type radio */}
          <div className="flex gap-3">
            {(['daily', 'weekly'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => onChange({ recurrenceType: t })}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] font-medium',
                  data.recurrenceType === t
                    ? 'border-primary bg-primary/[0.06] text-primary font-semibold'
                    : 'border-border text-muted-foreground hover:bg-muted'
                )}
              >
                <span className={cn(
                  'flex h-3.5 w-3.5 items-center justify-center rounded-full border-2',
                  data.recurrenceType === t ? 'border-primary' : 'border-muted-foreground'
                )}>
                  {data.recurrenceType === t && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </span>
                {t === 'daily' ? 'Daily' : 'Weekly'}
              </button>
            ))}
          </div>

          {/* Day of week (weekly only) */}
          {data.recurrenceType === 'weekly' && (
            <div className="space-y-2">
              <div className="text-[12px] font-semibold text-muted-foreground">Day of Week</div>
              <div className="flex gap-1.5">
                {DAY_NAMES.map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onChange({ recurrenceDayOfWeek: i })}
                    disabled={disabled}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] text-[12px] font-semibold',
                      data.recurrenceDayOfWeek === i
                        ? 'border-primary bg-primary text-white'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <FieldError msg={errors.recurrenceDayOfWeek} />
            </div>
          )}

          {/* Occurrences */}
          <div className="space-y-1">
            <div className="text-[12px] font-semibold text-muted-foreground">Number of Occurrences (2–52)</div>
            <input
              type="number"
              className={cn(inputCls(errors.recurrenceOccurrences), 'max-w-[120px]')}
              value={data.recurrenceOccurrences}
              onChange={e => onChange({ recurrenceOccurrences: e.target.value })}
              min={2}
              max={52}
              disabled={disabled}
            />
            <FieldError msg={errors.recurrenceOccurrences} />
          </div>

          {/* Preview */}
          <RecurrencePreview
            type={data.recurrenceType}
            dayOfWeek={data.recurrenceDayOfWeek}
            occurrences={data.recurrenceOccurrences}
            maxSeats={data.maxSeats}
          />
        </div>
      )}
    </div>
  )
}

// ─── Default form data ────────────────────────────────────────────────────────

export function defaultEventFormData(): EventFormData {
  return {
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    registrationDeadline: '',
    venue: '',
    meetingLink: '',
    maxSeats: '',
    feeRupees: '',
    recurrenceEnabled: false,
    recurrenceType: 'weekly',
    recurrenceDayOfWeek: null,
    recurrenceOccurrences: '8',
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function validateEventForm(data: EventFormData): EventFormErrors {
  const errors: EventFormErrors = {}

  if (!data.title.trim()) errors.title = 'Title is required'
  if (!data.date) errors.date = 'Date is required'
  if (!data.startTime) errors.startTime = 'Start time is required'
  if (!data.endTime) errors.endTime = 'End time is required'
  else if (data.startTime && data.endTime && data.endTime <= data.startTime) {
    errors.endTime = 'End time must be after start time'
  }

  const seats = parseInt(data.maxSeats, 10)
  if (!data.maxSeats || isNaN(seats) || seats < 1 || seats > 500) {
    errors.maxSeats = 'Max seats must be between 1 and 500'
  }

  if (data.meetingLink && data.meetingLink.trim()) {
    try { new URL(data.meetingLink) } catch { errors.meetingLink = 'Enter a valid URL' }
  }

  if (data.recurrenceEnabled) {
    const occ = parseInt(data.recurrenceOccurrences, 10)
    if (isNaN(occ) || occ < 2 || occ > 52) {
      errors.recurrenceOccurrences = 'Occurrences must be between 2 and 52'
    }
    if (data.recurrenceType === 'weekly' && data.recurrenceDayOfWeek === null) {
      errors.recurrenceDayOfWeek = 'Select a day of week'
    }
  }

  return errors
}

// ─── Build API payload ────────────────────────────────────────────────────────

export function buildEventPayload(data: EventFormData): Record<string, unknown> {
  // Build ISO datetimes. Treat date+time as IST (UTC+5:30)
  const startTime = `${data.date}T${data.startTime}:00+05:30`
  const endTime = `${data.date}T${data.endTime}:00+05:30`

  const payload: Record<string, unknown> = {
    title: data.title.trim(),
    description: data.description.trim() || undefined,
    startTime,
    endTime,
    venue: data.venue.trim() || undefined,
    meetingLink: data.meetingLink.trim() || undefined,
    maxSeats: parseInt(data.maxSeats, 10),
  }

  if (data.registrationDeadline) {
    payload.registrationDeadline = new Date(data.registrationDeadline).toISOString()
  }

  if (data.feeRupees) {
    const rupees = parseFloat(data.feeRupees)
    if (!isNaN(rupees)) payload.feePaise = Math.round(rupees * 100)
  }

  if (data.recurrenceEnabled) {
    payload.recurrence = {
      type: data.recurrenceType,
      dayOfWeek: data.recurrenceType === 'weekly' ? data.recurrenceDayOfWeek : undefined,
      occurrences: parseInt(data.recurrenceOccurrences, 10),
    }
  }

  return payload
}
