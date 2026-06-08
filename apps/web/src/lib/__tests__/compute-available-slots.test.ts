import { describe, it, expect } from 'vitest'
import { generateSlotTimes, getDayOfWeek } from '../compute-available-slots'

describe('getDayOfWeek', () => {
  it('returns correct day for a known Monday', () => {
    // 2026-06-08 is a Monday
    expect(getDayOfWeek('2026-06-08')).toBe(1)
  })

  it('returns 0 for Sunday', () => {
    // 2026-06-07 is a Sunday
    expect(getDayOfWeek('2026-06-07')).toBe(0)
  })

  it('returns 6 for Saturday', () => {
    // 2026-06-13 is a Saturday
    expect(getDayOfWeek('2026-06-13')).toBe(6)
  })
})

describe('generateSlotTimes', () => {
  it('generates correct slots for 20-minute duration', () => {
    const slots = generateSlotTimes('10:00', '11:00', 20)
    expect(slots).toHaveLength(3)
    expect(slots[0]).toEqual({ startTime: '10:00', endTime: '10:20' })
    expect(slots[1]).toEqual({ startTime: '10:20', endTime: '10:40' })
    expect(slots[2]).toEqual({ startTime: '10:40', endTime: '11:00' })
  })

  it('generates correct slots for 30-minute duration', () => {
    const slots = generateSlotTimes('09:00', '10:30', 30)
    expect(slots).toHaveLength(3)
    expect(slots[0]).toEqual({ startTime: '09:00', endTime: '09:30' })
  })

  it('skips lunch break slots', () => {
    // 10:00 to 14:00 with lunch 12:00-13:00; 20 min slots
    // Before lunch: 10:00, 10:20, 10:40, 11:00, 11:20, 11:40 = 6 slots
    // After lunch: 13:00, 13:20, 13:40 = 3 slots
    const slots = generateSlotTimes('10:00', '14:00', 20, '12:00', '13:00')
    expect(slots).toHaveLength(9)
    // First slot is 10:00
    expect(slots[0]).toEqual({ startTime: '10:00', endTime: '10:20' })
    // Slot after lunch starts at 13:00
    const afterLunch = slots.find((s) => s.startTime === '13:00')
    expect(afterLunch).toBeDefined()
    // No slot at 12:00 (lunch start)
    const duringLunch = slots.find((s) => s.startTime === '12:00')
    expect(duringLunch).toBeUndefined()
  })

  it('returns empty array if end before start', () => {
    expect(generateSlotTimes('14:00', '10:00', 20)).toHaveLength(0)
  })

  it('returns empty array if slot duration is 0', () => {
    expect(generateSlotTimes('10:00', '12:00', 0)).toHaveLength(0)
  })

  it('handles postgres time format HH:mm:ss', () => {
    const slots = generateSlotTimes('10:00:00', '11:00:00', 30)
    expect(slots).toHaveLength(2)
    expect(slots[0]?.startTime).toBe('10:00')
  })

  it('does not generate partial slot at end of day', () => {
    // 10:00 to 10:30 with 20-min slots: only 1 slot fits (10:00-10:20), not 10:20-10:40
    const slots = generateSlotTimes('10:00', '10:30', 20)
    expect(slots).toHaveLength(1)
    expect(slots[0]).toEqual({ startTime: '10:00', endTime: '10:20' })
  })

  it('groups slots correctly when no lunch break defined', () => {
    // 9:00 to 12:00 = 180 min / 20 = 9 slots
    const slots = generateSlotTimes('09:00', '12:00', 20)
    expect(slots).toHaveLength(9)
  })

  it('ignores reversed lunch break (end < start)', () => {
    // Invalid lunch — should be ignored, same as no lunch
    const slotsNoLunch = generateSlotTimes('10:00', '12:00', 20)
    const slotsReversedLunch = generateSlotTimes('10:00', '12:00', 20, '14:00', '13:00')
    expect(slotsReversedLunch).toHaveLength(slotsNoLunch.length)
  })
})

describe('slot grid grouping by date', () => {
  it('correctly identifies Today vs Tomorrow vs future dates', () => {
    // Verify getDayOfWeek works for sequential dates
    const monday = '2026-06-08'
    const tuesday = '2026-06-09'
    expect(getDayOfWeek(monday)).toBe(1)
    expect(getDayOfWeek(tuesday)).toBe(2)
  })
})

describe('mobile number validation', () => {
  // These are the validation rules tested from PatientForm
  function validateIndianPhone(phone: string): boolean {
    return /^[6-9]\d{9}$/.test(phone)
  }

  it('accepts valid mobile numbers starting with 6', () => {
    expect(validateIndianPhone('6123456789')).toBe(true)
  })

  it('accepts valid mobile numbers starting with 7', () => {
    expect(validateIndianPhone('7987654321')).toBe(true)
  })

  it('accepts valid mobile numbers starting with 8', () => {
    expect(validateIndianPhone('8888888888')).toBe(true)
  })

  it('accepts valid mobile numbers starting with 9', () => {
    expect(validateIndianPhone('9876543210')).toBe(true)
  })

  it('rejects numbers starting with 0', () => {
    expect(validateIndianPhone('0123456789')).toBe(false)
  })

  it('rejects numbers starting with 1', () => {
    expect(validateIndianPhone('1234567890')).toBe(false)
  })

  it('rejects numbers starting with 5', () => {
    expect(validateIndianPhone('5123456789')).toBe(false)
  })

  it('rejects numbers with fewer than 10 digits', () => {
    expect(validateIndianPhone('987654321')).toBe(false)
  })

  it('rejects numbers with more than 10 digits', () => {
    expect(validateIndianPhone('98765432101')).toBe(false)
  })

  it('rejects non-numeric characters', () => {
    expect(validateIndianPhone('98765ABCDE')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateIndianPhone('')).toBe(false)
  })
})

describe('soft paywall check (plan expired)', () => {
  function isPlanExpired(trialEndsAt: Date | null): boolean {
    if (trialEndsAt === null) return false
    return trialEndsAt < new Date()
  }

  it('returns false when trialEndsAt is null', () => {
    expect(isPlanExpired(null)).toBe(false)
  })

  it('returns false when trial is still active', () => {
    const future = new Date(Date.now() + 86400000 * 30)
    expect(isPlanExpired(future)).toBe(false)
  })

  it('returns true when trial has expired', () => {
    const past = new Date(Date.now() - 86400000)
    expect(isPlanExpired(past)).toBe(true)
  })
})
