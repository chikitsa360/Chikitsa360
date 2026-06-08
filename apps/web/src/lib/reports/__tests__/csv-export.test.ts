import { describe, it, expect } from 'vitest'
import { generateCsv, generateCsvFilename, appointmentsToCsvRows, revenueToCsvRows, patientGrowthToCsvRows } from '../csv-export'

describe('generateCsv', () => {
  it('starts with UTF-8 BOM (\\uFEFF)', () => {
    const csv = generateCsv([{ name: 'Test', value: 1 }])
    expect(csv.startsWith('\uFEFF')).toBe(true)
  })

  it('includes header row', () => {
    const csv = generateCsv([{ Name: 'राम', Fee: 500 }])
    expect(csv).toContain('Name')
    expect(csv).toContain('Fee')
  })

  it('includes Devanagari characters correctly', () => {
    const csv = generateCsv([{ 'Patient Name': 'राम कुमार', Fee: 500 }])
    expect(csv).toContain('राम कुमार')
  })
})

describe('generateCsvFilename', () => {
  it('returns correct filename format', () => {
    const name = generateCsvFilename('appointments', 'dr-kumar-clinic', '2026-01-01', '2026-01-31')
    expect(name).toBe('appointments-dr-kumar-clinic-2026-01-01-2026-01-31.csv')
  })

  it('uses provided report type in filename', () => {
    const name = generateCsvFilename('revenue', 'clinic-slug', '2026-05-01', '2026-05-31')
    expect(name).toContain('revenue')
    expect(name).toContain('clinic-slug')
  })
})

describe('appointmentsToCsvRows', () => {
  it('uses plain number for consultation fee (no ₹ symbol)', () => {
    const rows = appointmentsToCsvRows([{
      date: '2026-01-15',
      time: '10:00',
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      status: 'completed',
      bookingSource: 'portal',
      consultationFee: 1500,
      paymentStatus: 'paid',
    }])
    expect(rows[0]?.['Consultation Fee (INR)']).toBe(1500)
    expect(String(rows[0]?.['Consultation Fee (INR)'])).not.toContain('₹')
  })

  it('uses ISO 8601 date format', () => {
    const rows = appointmentsToCsvRows([{
      date: '2026-01-15',
      time: '10:00',
      patientName: 'Test',
      doctorName: 'Dr. X',
      status: 'completed',
      bookingSource: 'portal',
      consultationFee: null,
      paymentStatus: 'unpaid',
    }])
    expect(rows[0]?.['Date']).toBe('2026-01-15')
  })

  it('leaves consultation fee empty when null', () => {
    const rows = appointmentsToCsvRows([{
      date: '2026-01-15',
      time: null,
      patientName: 'Test',
      doctorName: 'Dr. X',
      status: 'scheduled',
      bookingSource: 'web',
      consultationFee: null,
      paymentStatus: 'unpaid',
    }])
    expect(rows[0]?.['Consultation Fee (INR)']).toBe('')
  })
})

describe('patientGrowthToCsvRows', () => {
  it('uses "Week Starting" header for weekly grouping', () => {
    const rows = patientGrowthToCsvRows([{ period: '2026-01-05', newPatients: 3 }], false)
    expect(Object.keys(rows[0] ?? {})).toContain('Week Starting')
  })

  it('uses "Month" header for monthly grouping', () => {
    const rows = patientGrowthToCsvRows([{ period: '2026-01-01', newPatients: 10 }], true)
    expect(Object.keys(rows[0] ?? {})).toContain('Month')
  })
})
