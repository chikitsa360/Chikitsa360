import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the redis module
vi.mock('../redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
  },
}))

// Mock MSG91 fetch
global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)

import { redis } from '../redis'
import {
  sendOtp,
  verifyOtp,
  OtpExpiredError,
  OtpInvalidError,
  OtpLockedError,
} from '../otp'

const mockRedis = redis as unknown as {
  get: ReturnType<typeof vi.fn>
  set: ReturnType<typeof vi.fn>
  del: ReturnType<typeof vi.fn>
  incr: ReturnType<typeof vi.fn>
  expire: ReturnType<typeof vi.fn>
  ttl: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: no lockout
  mockRedis.ttl.mockResolvedValue(-1)
  mockRedis.set.mockResolvedValue('OK')
  mockRedis.del.mockResolvedValue(1)
  mockRedis.incr.mockResolvedValue(1)
  mockRedis.expire.mockResolvedValue(1)
})

describe('sendOtp', () => {
  it('returns a nonce on success', async () => {
    const result = await sendOtp('9876543210')
    expect(result).toHaveProperty('nonce')
    expect(typeof result.nonce).toBe('string')
    expect(result.nonce.length).toBeGreaterThan(0)
  })

  it('stores OTP in Redis with TTL', async () => {
    await sendOtp('9876543210')
    expect(mockRedis.set).toHaveBeenCalledWith(
      expect.stringMatching(/^otp:9876543210:/),
      expect.stringMatching(/^\d{6}$/),
      { ex: 600 }
    )
  })

  it('throws OtpLockedError when phone is locked', async () => {
    mockRedis.ttl.mockResolvedValue(600) // 10 minutes remaining
    await expect(sendOtp('9876543210')).rejects.toThrow(OtpLockedError)
  })
})

describe('verifyOtp', () => {
  it('returns true on correct OTP', async () => {
    mockRedis.get.mockResolvedValue('123456')
    const result = await verifyOtp('9876543210', 'test-nonce', '123456')
    expect(result).toBe(true)
  })

  it('cleans up Redis on success', async () => {
    mockRedis.get.mockResolvedValue('123456')
    await verifyOtp('9876543210', 'test-nonce', '123456')
    expect(mockRedis.del).toHaveBeenCalledWith('otp:9876543210:test-nonce')
    expect(mockRedis.del).toHaveBeenCalledWith('otp:9876543210:attempts')
  })

  it('throws OtpExpiredError when OTP not found in Redis', async () => {
    mockRedis.get.mockResolvedValue(null)
    await expect(verifyOtp('9876543210', 'nonce', '123456')).rejects.toThrow(OtpExpiredError)
  })

  it('throws OtpInvalidError on wrong OTP', async () => {
    mockRedis.get.mockResolvedValue('654321')
    mockRedis.incr.mockResolvedValue(1) // first attempt
    await expect(verifyOtp('9876543210', 'nonce', '123456')).rejects.toThrow(OtpInvalidError)
  })

  it('throws OtpLockedError after 3 failed attempts', async () => {
    mockRedis.get.mockResolvedValue('654321')
    mockRedis.incr.mockResolvedValue(3) // 3rd attempt → lockout
    await expect(verifyOtp('9876543210', 'nonce', '123456')).rejects.toThrow(OtpLockedError)
  })

  it('sets correct lockout TTL (15 min) after max attempts', async () => {
    mockRedis.get.mockResolvedValue('654321')
    mockRedis.incr.mockResolvedValue(3)
    try {
      await verifyOtp('9876543210', 'nonce', '123456')
    } catch {
      // expected
    }
    expect(mockRedis.set).toHaveBeenCalledWith(
      'otp:9876543210:lockout',
      '1',
      { ex: 900 }
    )
  })

  it('throws OtpLockedError when phone is locked', async () => {
    mockRedis.ttl.mockResolvedValue(600) // locked
    await expect(verifyOtp('9876543210', 'nonce', '123456')).rejects.toThrow(OtpLockedError)
  })
})
