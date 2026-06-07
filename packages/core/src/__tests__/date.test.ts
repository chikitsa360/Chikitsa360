import { describe, it, expect } from 'vitest'
import { formatIST, formatISTDate, formatISTTime, parseIST, getTodayIST, toIST } from '../utils/date'

describe('toIST', () => {
  it('adds 5h30m to UTC', () => {
    const utc = new Date('2024-01-01T00:00:00.000Z')
    const ist = toIST(utc)
    // 00:00 UTC = 05:30 IST
    expect(ist.getUTCHours()).toBe(5)
    expect(ist.getUTCMinutes()).toBe(30)
  })

  it('handles midnight boundary', () => {
    const utc = new Date('2024-01-01T18:30:00.000Z')
    const ist = toIST(utc)
    // 18:30 UTC = 00:00 IST next day
    expect(ist.getUTCHours()).toBe(0)
    expect(ist.getUTCMinutes()).toBe(0)
  })
})

describe('formatIST', () => {
  it('formats a UTC date in IST timezone', () => {
    const utc = new Date('2024-06-15T06:30:00.000Z')
    const formatted = formatIST(utc)
    // 06:30 UTC = 12:00 IST
    expect(formatted).toContain('12:00')
  })

  it('accepts string input', () => {
    expect(() => formatIST('2024-06-15T06:30:00.000Z')).not.toThrow()
  })

  it('accepts number input', () => {
    expect(() => formatIST(Date.now())).not.toThrow()
  })
})

describe('formatISTDate', () => {
  it('returns a date string without time', () => {
    const result = formatISTDate('2024-06-15T06:30:00.000Z')
    expect(result).not.toContain(':')
    expect(result).toContain('2024')
  })
})

describe('formatISTTime', () => {
  it('returns only time portion', () => {
    const result = formatISTTime('2024-06-15T06:30:00.000Z')
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })
})

describe('parseIST', () => {
  it('is inverse of toIST', () => {
    const original = new Date('2024-06-15T12:00:00.000Z')
    const ist = toIST(original)
    const back = parseIST(ist.toISOString())
    // Should be close to original (within ms)
    expect(Math.abs(back.getTime() - original.getTime())).toBeLessThan(1000)
  })
})

describe('getTodayIST', () => {
  it('returns YYYY-MM-DD format', () => {
    const result = getTodayIST()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
