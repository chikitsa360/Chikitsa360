import { describe, it, expect } from 'vitest'
import { buildConfirmationMessage, buildSmsMessage } from '../build-confirmation-message'
import type { AppointmentDetails } from '../build-confirmation-message'

const baseDetails: AppointmentDetails = {
  patientFirstName: 'Rahul',
  tokenNumber: 7,
  doctorName: 'Dr. Sharma',
  date: '2026-06-08',
  startTime: '15:30',
  clinicName: 'City Clinic',
  address: '123 Main St, Mumbai',
  language: 'en',
}

describe('buildConfirmationMessage (English)', () => {
  it('includes all required fields', () => {
    const msg = buildConfirmationMessage(baseDetails)
    expect(msg).toContain('Token #7')
    expect(msg).toContain('Dr. Sharma')
    expect(msg).toContain('3:30 PM')
    expect(msg).toContain('City Clinic')
    expect(msg).toContain('123 Main St, Mumbai')
    expect(msg).toContain('Rahul')
  })

  it('labels today correctly', () => {
    const today = new Date().toISOString().slice(0, 10)
    const msg = buildConfirmationMessage({ ...baseDetails, date: today })
    expect(msg).toContain('Today')
  })
})

describe('buildConfirmationMessage (Hindi)', () => {
  it('uses Hindi template', () => {
    const msg = buildConfirmationMessage({ ...baseDetails, language: 'hi' })
    expect(msg).toContain('confirm ho gayi')
    expect(msg).toContain('Token #7')
    expect(msg).toContain('Dr. Sharma')
  })
})

describe('buildSmsMessage', () => {
  it('returns content under 160 characters', () => {
    const sms = buildSmsMessage(baseDetails)
    expect(sms.length).toBeLessThanOrEqual(160)
  })

  it('includes key details', () => {
    const sms = buildSmsMessage(baseDetails)
    expect(sms).toContain('Token #7')
    expect(sms).toContain('Dr. Sharma')
    expect(sms).toContain('City Clinic')
  })

  it('omits address when null', () => {
    const sms = buildSmsMessage({ ...baseDetails, address: null })
    expect(sms).not.toContain('undefined')
    expect(sms).not.toContain('null')
    expect(sms.length).toBeLessThanOrEqual(160)
  })
})
