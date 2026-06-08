import { describe, it, expect } from 'vitest'
import { getWeekDates } from '@/components/appointments/WeekView'
import { getDayOfWeek } from '@/lib/compute-available-slots'

// ─── Status badge colour mapping ──────────────────────────────────────────────
import { statusBadgeClass, statusBorderColor } from '@/components/appointments/AppointmentCard'

describe('statusBadgeClass', () => {
  it('returns blue classes for confirmed', () => {
    expect(statusBadgeClass('confirmed')).toContain('blue')
  })
  it('returns green classes for completed', () => {
    expect(statusBadgeClass('completed')).toContain('green')
  })
  it('returns neutral classes for cancelled', () => {
    expect(statusBadgeClass('cancelled')).toContain('neutral')
  })
  it('returns amber classes for no-show', () => {
    expect(statusBadgeClass('no-show')).toContain('amber')
  })
})

describe('statusBorderColor', () => {
  it('returns blue border for confirmed', () => {
    expect(statusBorderColor('confirmed')).toContain('blue')
  })
  it('returns green border for completed', () => {
    expect(statusBorderColor('completed')).toContain('green')
  })
  it('returns neutral border for cancelled', () => {
    expect(statusBorderColor('cancelled')).toContain('neutral')
  })
  it('returns amber border for no-show', () => {
    expect(statusBorderColor('no-show')).toContain('amber')
  })
})

// ─── Week view date grouping ───────────────────────────────────────────────────
describe('getWeekDates', () => {
  it('returns 7 dates', () => {
    expect(getWeekDates('2026-06-08')).toHaveLength(7)
  })

  it('starts on Monday for a Monday input', () => {
    const dates = getWeekDates('2026-06-08') // 2026-06-08 is a Monday
    expect(dates[0]).toBe('2026-06-08')
  })

  it('starts on Monday for a Wednesday input', () => {
    const dates = getWeekDates('2026-06-10') // Wednesday
    expect(dates[0]).toBe('2026-06-08') // Monday of same week
  })

  it('starts on Monday for a Sunday input', () => {
    const dates = getWeekDates('2026-06-14') // Sunday
    expect(dates[0]).toBe('2026-06-08') // Monday of same week
  })

  it('ends on Sunday', () => {
    const dates = getWeekDates('2026-06-08')
    expect(dates[6]).toBe('2026-06-14') // Sunday
  })

  it('returns consecutive dates', () => {
    const dates = getWeekDates('2026-06-08')
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]!)
      const curr = new Date(dates[i]!)
      const diff = curr.getTime() - prev.getTime()
      expect(diff).toBe(86400000) // exactly 1 day
    }
  })
})

// ─── Day view date grouping (getDayOfWeek from compute-available-slots) ────────
describe('getDayOfWeek (appointment date grouping)', () => {
  it('returns 1 for Monday 2026-06-08', () => {
    expect(getDayOfWeek('2026-06-08')).toBe(1) // Monday
  })
  it('returns 0 for Sunday 2026-06-07', () => {
    expect(getDayOfWeek('2026-06-07')).toBe(0) // Sunday
  })
  it('returns 6 for Saturday 2026-06-13', () => {
    expect(getDayOfWeek('2026-06-13')).toBe(6) // Saturday
  })
})
