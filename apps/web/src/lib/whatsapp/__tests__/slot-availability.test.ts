import { describe, it, expect } from 'vitest'
import { formatDayLabel, formatTimeLabel } from '../slot-availability'

describe('formatDayLabel', () => {
  it('returns "Today" for today\'s date', () => {
    const today = new Date().toISOString().slice(0, 10)
    expect(formatDayLabel(today, today)).toBe('Today')
  })

  it('returns "Tomorrow" for tomorrow\'s date', () => {
    const today = '2026-06-08'
    const tomorrow = '2026-06-09'
    expect(formatDayLabel(tomorrow, today)).toBe('Tomorrow')
  })

  it('returns formatted date for other days', () => {
    const today = '2026-06-08'
    const other = '2026-06-15'
    const label = formatDayLabel(other, today)
    expect(label).toContain('Jun')
    expect(label).toContain('15')
  })
})

describe('formatTimeLabel', () => {
  it('formats morning time (AM)', () => {
    expect(formatTimeLabel('10:00')).toBe('10:00 AM')
    expect(formatTimeLabel('09:30')).toBe('9:30 AM')
  })

  it('formats noon correctly', () => {
    expect(formatTimeLabel('12:00')).toBe('12:00 PM')
  })

  it('formats afternoon/evening (PM)', () => {
    expect(formatTimeLabel('14:30')).toBe('2:30 PM')
    expect(formatTimeLabel('15:00')).toBe('3:00 PM')
    expect(formatTimeLabel('18:45')).toBe('6:45 PM')
  })

  it('formats midnight correctly', () => {
    expect(formatTimeLabel('00:00')).toBe('12:00 AM')
  })
})
