import { describe, it, expect } from 'vitest'
import {
  phoneSchema,
  sendOtpSchema,
  verifyOtpSchema,
  createClinicSchema,
  inviteStaffSchema,
  createPatientSchema,
  appointmentStatusSchema,
} from '../schemas'

describe('phoneSchema', () => {
  it('accepts valid 10-digit Indian numbers', () => {
    expect(phoneSchema.safeParse('9876543210').success).toBe(true)
    expect(phoneSchema.safeParse('6000000000').success).toBe(true)
  })

  it('rejects numbers starting below 6', () => {
    expect(phoneSchema.safeParse('1234567890').success).toBe(false)
    expect(phoneSchema.safeParse('5000000000').success).toBe(false)
  })

  it('rejects < 10 digits', () => {
    expect(phoneSchema.safeParse('987654321').success).toBe(false)
  })

  it('rejects > 10 digits', () => {
    expect(phoneSchema.safeParse('98765432100').success).toBe(false)
  })

  it('trims whitespace', () => {
    expect(phoneSchema.safeParse(' 9876543210 ').success).toBe(true)
  })
})

describe('sendOtpSchema', () => {
  it('validates phone field', () => {
    expect(sendOtpSchema.safeParse({ phone: '9876543210' }).success).toBe(true)
    expect(sendOtpSchema.safeParse({ phone: 'abc' }).success).toBe(false)
  })
})

describe('verifyOtpSchema', () => {
  it('accepts valid OTP payload', () => {
    const result = verifyOtpSchema.safeParse({
      phone: '9876543210',
      otp: '123456',
      nonce: 'abc-nonce',
    })
    expect(result.success).toBe(true)
  })

  it('rejects OTP with wrong length', () => {
    expect(verifyOtpSchema.safeParse({ phone: '9876543210', otp: '12345', nonce: 'n' }).success).toBe(false)
    expect(verifyOtpSchema.safeParse({ phone: '9876543210', otp: '1234567', nonce: 'n' }).success).toBe(false)
  })

  it('rejects non-numeric OTP', () => {
    expect(verifyOtpSchema.safeParse({ phone: '9876543210', otp: 'abcdef', nonce: 'n' }).success).toBe(false)
  })

  it('requires nonce', () => {
    expect(verifyOtpSchema.safeParse({ phone: '9876543210', otp: '123456', nonce: '' }).success).toBe(false)
  })
})

describe('createClinicSchema', () => {
  it('accepts valid clinic data', () => {
    const result = createClinicSchema.safeParse({ name: 'My Clinic', slug: 'my-clinic' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid slug with uppercase', () => {
    expect(createClinicSchema.safeParse({ name: 'Clinic', slug: 'My-Clinic' }).success).toBe(false)
  })

  it('uses STARTER as default plan', () => {
    const result = createClinicSchema.safeParse({ name: 'Clinic', slug: 'clinic' })
    expect(result.success && result.data.plan).toBe('STARTER')
  })
})

describe('inviteStaffSchema', () => {
  it('accepts valid staff invite', () => {
    expect(inviteStaffSchema.safeParse({ phone: '9876543210', role: 'DOCTOR' }).success).toBe(true)
    expect(inviteStaffSchema.safeParse({ phone: '9876543210', role: 'RECEPTIONIST' }).success).toBe(true)
  })

  it('rejects OWNER role (cannot be invited)', () => {
    expect(inviteStaffSchema.safeParse({ phone: '9876543210', role: 'OWNER' }).success).toBe(false)
  })
})

describe('createPatientSchema', () => {
  it('accepts minimal patient data', () => {
    expect(createPatientSchema.safeParse({ phone: '9876543210', name: 'Priya Kumar' }).success).toBe(true)
  })

  it('rejects short name', () => {
    expect(createPatientSchema.safeParse({ phone: '9876543210', name: 'P' }).success).toBe(false)
  })
})

describe('appointmentStatusSchema', () => {
  it('accepts all valid statuses', () => {
    for (const s of ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show']) {
      expect(appointmentStatusSchema.safeParse(s).success).toBe(true)
    }
  })

  it('rejects unknown status', () => {
    expect(appointmentStatusSchema.safeParse('pending').success).toBe(false)
  })
})
