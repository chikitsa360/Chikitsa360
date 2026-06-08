import { describe, it, expect } from 'vitest'
import { computeSlotCount } from '../slots'

describe('computeSlotCount', () => {
  it('basic 9 hours at 20 min = 27 slots', () => {
    expect(computeSlotCount('10:00', '19:00', 20)).toBe(27)
  })

  it('basic 9 hours at 30 min = 18 slots', () => {
    expect(computeSlotCount('10:00', '19:00', 30)).toBe(18)
  })

  it('basic 9 hours at 15 min = 36 slots', () => {
    expect(computeSlotCount('10:00', '19:00', 15)).toBe(36)
  })

  it('basic 9 hours at 60 min = 9 slots', () => {
    expect(computeSlotCount('10:00', '19:00', 60)).toBe(9)
  })

  it('lunch break reduces slot count', () => {
    // 10:00–19:00 = 540 min; lunch 13:00–14:00 = 60 min; remaining = 480 min; 480/20 = 24
    expect(computeSlotCount('10:00', '19:00', 20, '13:00', '14:00')).toBe(24)
  })

  it('lunch break with 30 min slots', () => {
    // 480/30 = 16
    expect(computeSlotCount('10:00', '19:00', 30, '13:00', '14:00')).toBe(16)
  })

  it('returns 0 when end time is before start time', () => {
    expect(computeSlotCount('19:00', '10:00', 20)).toBe(0)
  })

  it('returns 0 when end time equals start time', () => {
    expect(computeSlotCount('10:00', '10:00', 20)).toBe(0)
  })

  it('returns 0 for invalid time strings', () => {
    expect(computeSlotCount('', '', 20)).toBe(0)
  })

  it('ignores invalid lunch break (reversed)', () => {
    // Lunch end before lunch start — should be ignored
    expect(computeSlotCount('10:00', '19:00', 20, '14:00', '13:00')).toBe(27)
  })

  it('handles partial slots (floors)', () => {
    // 10:00–10:30 = 30 min; 20 min slots → floor(30/20) = 1
    expect(computeSlotCount('10:00', '10:30', 20)).toBe(1)
  })
})

describe('computeSlotCount - plan limits', () => {
  const PLAN_DOCTOR_LIMITS: Record<string, number> = {
    STARTER: 1,
    GROWTH: 3,
    PRO: 10,
  }

  it('Starter plan allows 1 doctor', () => {
    expect(PLAN_DOCTOR_LIMITS['STARTER']).toBe(1)
  })

  it('Growth plan allows 3 doctors', () => {
    expect(PLAN_DOCTOR_LIMITS['GROWTH']).toBe(3)
  })

  it('Pro plan allows 10 doctors', () => {
    expect(PLAN_DOCTOR_LIMITS['PRO']).toBe(10)
  })
})
