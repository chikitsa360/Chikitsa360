import { describe, it, expect } from 'vitest'
import { getPlanStatus, isPlanExpired, isDoctorLimitReached, EXPIRY_WARNING_DAYS } from '../check-plan'

describe('getPlanStatus', () => {
  it('returns active when planExpiresAt is null', () => {
    expect(getPlanStatus(null)).toBe('active')
    expect(getPlanStatus(undefined)).toBe('active')
  })

  it('returns active when plan expires far in the future', () => {
    const future = new Date(Date.now() + (EXPIRY_WARNING_DAYS + 2) * 24 * 60 * 60 * 1000)
    expect(getPlanStatus(future)).toBe('active')
  })

  it('returns expiring_soon within warning window', () => {
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
    expect(getPlanStatus(soon)).toBe('expiring_soon')
  })

  it('returns expiring_soon at exactly EXPIRY_WARNING_DAYS boundary', () => {
    const boundary = new Date(Date.now() + EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000 - 1000)
    expect(getPlanStatus(boundary)).toBe('expiring_soon')
  })

  it('returns expired when plan has already passed', () => {
    const past = new Date(Date.now() - 86400000) // yesterday
    expect(getPlanStatus(past)).toBe('expired')
  })

  it('returns expired at exactly now (edge)', () => {
    const nowMinus1ms = new Date(Date.now() - 1)
    expect(getPlanStatus(nowMinus1ms)).toBe('expired')
  })
})

describe('isPlanExpired', () => {
  it('returns false for null', () => {
    expect(isPlanExpired(null)).toBe(false)
  })

  it('returns false for future date', () => {
    const future = new Date(Date.now() + 86400000 * 30)
    expect(isPlanExpired(future)).toBe(false)
  })

  it('returns true for past date', () => {
    const past = new Date(Date.now() - 86400000)
    expect(isPlanExpired(past)).toBe(true)
  })

  it('returns false for expiring_soon (not yet expired)', () => {
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
    expect(isPlanExpired(soon)).toBe(false)
  })
})

describe('isDoctorLimitReached', () => {
  it('returns false when under the limit', () => {
    expect(isDoctorLimitReached(1, 2)).toBe(false)
  })

  it('returns true when at the limit', () => {
    expect(isDoctorLimitReached(2, 2)).toBe(true)
  })

  it('returns true when over the limit', () => {
    expect(isDoctorLimitReached(3, 2)).toBe(true)
  })

  it('returns false at zero with any limit > 0', () => {
    expect(isDoctorLimitReached(0, 5)).toBe(false)
  })
})
