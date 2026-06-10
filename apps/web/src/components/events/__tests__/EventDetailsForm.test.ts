import { describe, it, expect } from 'vitest'
import { validateEventForm, buildEventPayload, defaultEventFormData } from '../EventDetailsForm'
import type { EventFormData } from '../EventDetailsForm'

// ─── Fee conversion ────────────────────────────────────────────────────────────

describe('fee conversion in buildEventPayload', () => {
  it('converts 150 rupees to 15000 paise', () => {
    const data: EventFormData = {
      ...defaultEventFormData(),
      title: 'Test Event',
      date: '2026-07-01',
      startTime: '10:00',
      endTime: '12:00',
      maxSeats: '30',
      feeRupees: '150',
    }
    const payload = buildEventPayload(data)
    expect(payload.feePaise).toBe(15000)
  })

  it('converts 0.5 rupees (50 paise) correctly', () => {
    const data: EventFormData = { ...defaultEventFormData(), title: 'T', date: '2026-07-01', startTime: '10:00', endTime: '12:00', maxSeats: '10', feeRupees: '0.5' }
    const payload = buildEventPayload(data)
    expect(payload.feePaise).toBe(50)
  })

  it('omits feePaise when fee is empty (free event)', () => {
    const data: EventFormData = { ...defaultEventFormData(), title: 'T', date: '2026-07-01', startTime: '10:00', endTime: '12:00', maxSeats: '10', feeRupees: '' }
    const payload = buildEventPayload(data)
    expect(payload.feePaise).toBeUndefined()
  })
})

// ─── Validation ────────────────────────────────────────────────────────────────

describe('validateEventForm', () => {
  const validData: EventFormData = {
    title: 'Diabetes Camp',
    description: '',
    date: '2026-07-01',
    startTime: '10:00',
    endTime: '12:00',
    registrationDeadline: '',
    venue: '',
    meetingLink: '',
    maxSeats: '30',
    feeRupees: '',
    recurrenceEnabled: false,
    recurrenceType: 'weekly',
    recurrenceDayOfWeek: null,
    recurrenceOccurrences: '8',
  }

  it('passes validation for valid data', () => {
    expect(validateEventForm(validData)).toEqual({})
  })

  it('requires title', () => {
    const errs = validateEventForm({ ...validData, title: '' })
    expect(errs.title).toBeTruthy()
  })

  it('requires date', () => {
    const errs = validateEventForm({ ...validData, date: '' })
    expect(errs.date).toBeTruthy()
  })

  it('requires start time', () => {
    const errs = validateEventForm({ ...validData, startTime: '' })
    expect(errs.startTime).toBeTruthy()
  })

  it('requires end time after start time', () => {
    const errs = validateEventForm({ ...validData, startTime: '12:00', endTime: '10:00' })
    expect(errs.endTime).toBeTruthy()
  })

  it('requires maxSeats between 1 and 500', () => {
    expect(validateEventForm({ ...validData, maxSeats: '0' }).maxSeats).toBeTruthy()
    expect(validateEventForm({ ...validData, maxSeats: '501' }).maxSeats).toBeTruthy()
    expect(validateEventForm({ ...validData, maxSeats: '1' }).maxSeats).toBeUndefined()
    expect(validateEventForm({ ...validData, maxSeats: '500' }).maxSeats).toBeUndefined()
  })

  it('validates meeting link URL', () => {
    const errs = validateEventForm({ ...validData, meetingLink: 'not-a-url' })
    expect(errs.meetingLink).toBeTruthy()
  })

  it('recurrence: requires occurrences between 2 and 52', () => {
    const errs = validateEventForm({ ...validData, recurrenceEnabled: true, recurrenceOccurrences: '1' })
    expect(errs.recurrenceOccurrences).toBeTruthy()
  })

  it('recurrence: requires dayOfWeek for weekly', () => {
    const errs = validateEventForm({ ...validData, recurrenceEnabled: true, recurrenceType: 'weekly', recurrenceDayOfWeek: null, recurrenceOccurrences: '4' })
    expect(errs.recurrenceDayOfWeek).toBeTruthy()
  })
})

// ─── buildEventPayload recurrence ─────────────────────────────────────────────

describe('buildEventPayload recurrence', () => {
  const base: EventFormData = {
    title: 'Yoga Class',
    description: '',
    date: '2026-07-01',
    startTime: '07:00',
    endTime: '08:00',
    registrationDeadline: '',
    venue: '',
    meetingLink: '',
    maxSeats: '20',
    feeRupees: '',
    recurrenceEnabled: true,
    recurrenceType: 'weekly',
    recurrenceDayOfWeek: 3,
    recurrenceOccurrences: '8',
  }

  it('includes recurrence in payload when enabled', () => {
    const payload = buildEventPayload(base)
    expect(payload.recurrence).toEqual({ type: 'weekly', dayOfWeek: 3, occurrences: 8 })
  })

  it('omits recurrence when disabled', () => {
    const payload = buildEventPayload({ ...base, recurrenceEnabled: false })
    expect(payload.recurrence).toBeUndefined()
  })

  it('omits dayOfWeek for daily recurrence', () => {
    const payload = buildEventPayload({ ...base, recurrenceType: 'daily' })
    const rec = payload.recurrence as { type: string; dayOfWeek?: number; occurrences: number }
    expect(rec.dayOfWeek).toBeUndefined()
  })
})
