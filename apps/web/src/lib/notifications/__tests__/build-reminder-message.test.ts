import { describe, it, expect, vi } from 'vitest'

// Mock slot-availability so formatDayLabel and formatTimeLabel return predictable values
vi.mock('@/lib/whatsapp/slot-availability', () => ({
  formatDayLabel: vi.fn(() => {
    return 'Mon, 9 Jun'
  }),
  formatTimeLabel: vi.fn((time: string) => {
    // Convert HH:MM to 12h format
    const [h, m] = time.split(':').map(Number)
    const suffix = (h ?? 0) >= 12 ? 'PM' : 'AM'
    const h12 = (h ?? 0) % 12 || 12
    return `${h12}:${String(m ?? 0).padStart(2, '0')} ${suffix}`
  }),
}))

import {
  build24hReminderMessage,
  build2hReminderMessage,
  build24hReminderSms,
  build2hReminderSms,
} from '../build-reminder-message'

const base = {
  patientFirstName: 'Rahul',
  tokenNumber: 7,
  doctorName: 'Sharma',
  date: '2026-06-10',
  startTime: '15:30',
  clinicName: 'City Clinic',
  address: '12 Main St',
  language: 'en' as const,
}

describe('build24hReminderMessage', () => {
  it('returns English message with all params', () => {
    const msg = build24hReminderMessage(base)
    expect(msg).toContain('Rahul')
    expect(msg).toContain('Sharma')
    expect(msg).toContain('#7')
    expect(msg).toContain('City Clinic')
  })

  it('returns Hindi message when language is hi', () => {
    const msg = build24hReminderMessage({ ...base, language: 'hi' })
    expect(msg).toContain('Rahul')
    expect(msg).toContain('#7')
  })
})

describe('build2hReminderMessage', () => {
  it('returns English message with reminder text', () => {
    const msg = build2hReminderMessage(base)
    expect(msg).toContain('Rahul')
    expect(msg).toContain('Sharma')
    expect(msg).toContain('CANCEL')
  })

  it('returns Hindi message when language is hi', () => {
    const msg = build2hReminderMessage({ ...base, language: 'hi' })
    expect(msg).toContain('Rahul')
  })
})

describe('build24hReminderSms', () => {
  it('produces SMS within 160 chars', () => {
    const sms = build24hReminderSms(base)
    expect(sms.length).toBeLessThanOrEqual(160)
    expect(sms).toContain('Sharma')
    expect(sms).toContain('#7')
    expect(sms).toContain('CANCEL')
  })
})

describe('build2hReminderSms', () => {
  it('produces SMS within 160 chars', () => {
    const sms = build2hReminderSms(base)
    expect(sms.length).toBeLessThanOrEqual(160)
    expect(sms).toContain('Sharma')
    expect(sms).toContain('#7')
  })
})
