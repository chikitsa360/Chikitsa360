import Papa from 'papaparse'

/**
 * Generates a UTF-8 BOM-prefixed CSV string from an array of row objects.
 * The BOM ensures correct rendering of Devanagari/Unicode characters in Excel (NFR-Report-3).
 */
export function generateCsv(rows: Record<string, unknown>[]): string {
  const csv = Papa.unparse(rows, { header: true })
  return '\uFEFF' + csv
}

/**
 * Returns the standard CSV filename for a report export.
 * Format: {reportType}-{clinicSlug}-{from}-{to}.csv
 */
export function generateCsvFilename(
  reportType: string,
  clinicSlug: string,
  from: string,
  to: string,
): string {
  return `${reportType}-${clinicSlug}-${from}-${to}.csv`
}

/**
 * Formats appointment rows for CSV export.
 * Monetary columns use plain numbers (no ₹ symbol in data cells).
 * Dates use ISO 8601 format.
 */
export function appointmentsToCsvRows(
  appointments: {
    date: string
    time: string | null
    patientName: string
    doctorName: string
    status: string
    bookingSource: string
    consultationFee: number | null
    paymentStatus: string
  }[]
): Record<string, unknown>[] {
  return appointments.map((a) => ({
    'Date': a.date,
    'Time': a.time ?? '',
    'Patient Name': a.patientName,
    'Doctor': a.doctorName,
    'Status': a.status,
    'Booking Source': a.bookingSource,
    'Consultation Fee (INR)': a.consultationFee ?? '',
    'Payment Status': a.paymentStatus,
  }))
}

/**
 * Formats revenue rows for CSV export.
 */
export function revenueToCsvRows(
  rows: {
    doctorName: string
    paidCount: number
    totalRevenue: number
    avgFee: number | null
  }[]
): Record<string, unknown>[] {
  return rows.map((r) => ({
    'Doctor': r.doctorName,
    'Paid Appointments': r.paidCount,
    'Total Revenue (INR)': r.totalRevenue,
    'Avg Fee (INR)': r.avgFee ?? '',
  }))
}

/**
 * Formats patient growth rows for CSV export.
 */
export function patientGrowthToCsvRows(
  rows: { period: string; newPatients: number }[],
  groupedByMonth: boolean,
): Record<string, unknown>[] {
  return rows.map((r) => ({
    [groupedByMonth ? 'Month' : 'Week Starting']: r.period,
    'New Patients': r.newPatients,
  }))
}
