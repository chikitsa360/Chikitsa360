import { describe, it, expect } from 'vitest'
import { generateRecurrenceDates, validateWeeklyDayOfWeek } from '../recurrence'

describe('generateRecurrenceDates', () => {
  it('generates correct daily dates for 5 occurrences', () => {
    const base = new Date('2026-07-01T07:00:00Z')
    const end = new Date('2026-07-01T08:00:00Z')
    const dates = generateRecurrenceDates({ baseStartTime: base, baseEndTime: end, type: 'daily', occurrences: 5 })

    expect(dates).toHaveLength(5)
    expect(dates[0]!.startTime.toISOString()).toBe('2026-07-01T07:00:00.000Z')
    expect(dates[1]!.startTime.toISOString()).toBe('2026-07-02T07:00:00.000Z')
    expect(dates[4]!.startTime.toISOString()).toBe('2026-07-05T07:00:00.000Z')
  })

  it('generates correct weekly dates for 8 occurrences', () => {
    // 2026-07-01 is a Wednesday (dayOfWeek=3 in UTC)
    const base = new Date('2026-07-01T07:00:00Z')
    const end = new Date('2026-07-01T08:00:00Z')
    const dates = generateRecurrenceDates({ baseStartTime: base, baseEndTime: end, type: 'weekly', dayOfWeek: 3, occurrences: 8 })

    expect(dates).toHaveLength(8)
    expect(dates[0]!.startTime.toISOString()).toBe('2026-07-01T07:00:00.000Z')
    expect(dates[1]!.startTime.toISOString()).toBe('2026-07-08T07:00:00.000Z')
    expect(dates[7]!.startTime.toISOString()).toBe('2026-08-19T07:00:00.000Z')
  })

  it('preserves duration in each occurrence', () => {
    const base = new Date('2026-07-01T07:00:00Z')
    const end = new Date('2026-07-01T08:30:00Z') // 1.5 hours
    const dates = generateRecurrenceDates({ baseStartTime: base, baseEndTime: end, type: 'daily', occurrences: 3 })

    for (const d of dates) {
      const durationMs = d.endTime.getTime() - d.startTime.getTime()
      expect(durationMs).toBe(90 * 60 * 1000)
    }
  })

  it('throws error when dayOfWeek mismatches base date', () => {
    // 2026-07-01 is Wednesday (day=3), requesting dayOfWeek=1 (Monday)
    const base = new Date('2026-07-01T07:00:00Z')
    const end = new Date('2026-07-01T08:00:00Z')
    expect(() =>
      generateRecurrenceDates({ baseStartTime: base, baseEndTime: end, type: 'weekly', dayOfWeek: 1, occurrences: 4 })
    ).toThrow()
  })
})

describe('validateWeeklyDayOfWeek', () => {
  it('returns null when day matches', () => {
    // 2026-07-01 is Wednesday (UTC day=3)
    const d = new Date('2026-07-01T07:00:00Z')
    expect(validateWeeklyDayOfWeek(d, 3)).toBeNull()
  })

  it('returns error message when day does not match', () => {
    const d = new Date('2026-07-01T07:00:00Z')
    const result = validateWeeklyDayOfWeek(d, 1)
    expect(result).toContain('Wednesday')
    expect(result).toContain('Monday')
  })
})
