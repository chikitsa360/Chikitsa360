'use client'

import { useState, useCallback, useEffect } from 'react'
import DateRangeFilter, { DateRange, getPresetRange } from '@/components/reports/DateRangeFilter'
import DoctorFilter from '@/components/reports/DoctorFilter'
import ReportSection from '@/components/reports/ReportSection'
import AppointmentSummaryCard from '@/components/reports/AppointmentSummaryCard'
import NoShowTrendChart from '@/components/reports/NoShowTrendChart'
import RevenueSummaryCard from '@/components/reports/RevenueSummaryCard'
import RevenueByDayChart from '@/components/reports/RevenueByDayChart'
import BookingSourceChart from '@/components/reports/BookingSourceChart'
import DoctorUtilisationTable from '@/components/reports/DoctorUtilisationTable'
import PatientGrowthChart from '@/components/reports/PatientGrowthChart'
import NewReturningDonut from '@/components/reports/NewReturningDonut'
import ExportButton from '@/components/reports/ExportButton'

type Tab = 'appointments' | 'revenue' | 'doctors' | 'patients'

interface Doctor {
  id: string
  name: string
}

interface ReportsClientProps {
  doctors: Doctor[]
}

// ── API response types ──────────────────────────────────────────────────────

interface AppointmentsData {
  summary: {
    total: number
    completed: number
    cancelled: number
    noShows: number
    completedPct: string
    cancelledPct: string
    noShowPct: string
  }
  byDoctor: {
    doctorId: string
    doctorName: string
    total: number
    completed: number
    cancelled: number
    noShows: number
    noShowPct: string
  }[]
}

interface NoshowTrendData {
  trend: { day: string; count: number }[]
}

interface RevenueData {
  summary: {
    totalRevenue: number
    totalPending: number
    paidCount: number
    avgFee: number | null
  }
  byDoctor: {
    doctorId: string
    doctorName: string
    totalRevenue: number
    paidCount: number
    avgFee: number | null
  }[]
  byDay: { period: string; revenue: number; paidCount: number }[]
  groupedByWeek: boolean
}

interface BookingSourceData {
  sources: { source: string; count: number; pct: string }[]
  total: number
}

interface UtilisationData {
  byDoctor: {
    doctorId: string
    doctorName: string
    availableSlots: number
    usedSlots: number
    utilisationPct: string | null
  }[]
  clinicAvgPct: string
}

interface PatientGrowthData {
  summary: {
    newPatients: number
    returningPatients: number
    totalUnique: number
    newPct: string
    returningPct: string
  }
  byPeriod: { period: string; newPatients: number }[]
  groupedByMonth: boolean
}

// ── Component ──────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'appointments', label: 'Appointments' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'doctors', label: 'Doctors' },
  { key: 'patients', label: 'Patients' },
]

export default function ReportsClient({ doctors }: ReportsClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('appointments')
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetRange('this-month'))
  const [doctorId, setDoctorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Data state per tab
  const [appointmentsData, setAppointmentsData] = useState<AppointmentsData | null>(null)
  const [noshowData, setNoshowData] = useState<NoshowTrendData | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [bookingSourceData, setBookingSourceData] = useState<BookingSourceData | null>(null)
  const [utilisationData, setUtilisationData] = useState<UtilisationData | null>(null)
  const [patientGrowthData, setPatientGrowthData] = useState<PatientGrowthData | null>(null)

  const fetchData = useCallback(async (tab: Tab, range: DateRange, dId: string | null) => {
    setLoading(true)
    const { from, to } = range
    const dParam = dId ? `&doctorId=${dId}` : ''

    try {
      if (tab === 'appointments') {
        const [aptRes, nsRes] = await Promise.all([
          fetch(`/api/v1/reports/appointments?from=${from}&to=${to}${dParam}`),
          fetch('/api/v1/reports/noshow-trend'),
        ])
        if (aptRes.ok) setAppointmentsData((await aptRes.json()) as AppointmentsData)
        if (nsRes.ok) setNoshowData((await nsRes.json()) as NoshowTrendData)
      } else if (tab === 'revenue') {
        const [revRes, bsRes] = await Promise.all([
          fetch(`/api/v1/reports/revenue?from=${from}&to=${to}${dParam}`),
          fetch(`/api/v1/reports/booking-sources?from=${from}&to=${to}${dParam}`),
        ])
        if (revRes.ok) setRevenueData((await revRes.json()) as RevenueData)
        if (bsRes.ok) setBookingSourceData((await bsRes.json()) as BookingSourceData)
      } else if (tab === 'doctors') {
        const res = await fetch(`/api/v1/reports/utilisation?from=${from}&to=${to}${dParam}`)
        if (res.ok) setUtilisationData((await res.json()) as UtilisationData)
      } else if (tab === 'patients') {
        const res = await fetch(`/api/v1/reports/patient-growth?from=${from}&to=${to}`)
        if (res.ok) setPatientGrowthData((await res.json()) as PatientGrowthData)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  // Fetch on tab/range/doctor change
  useEffect(() => {
    fetchData(activeTab, dateRange, doctorId)
  }, [activeTab, dateRange, doctorId, fetchData])

  function handleRangeChange(range: DateRange) {
    setDateRange(range)
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab)
  }

  const exportType: 'appointments' | 'revenue' | 'patients' =
    activeTab === 'appointments' ? 'appointments'
    : activeTab === 'revenue' ? 'revenue'
    : 'patients'

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b-2 border-[var(--color-border)] mb-5 gap-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 -mb-0.5 transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                : 'text-[var(--color-text-3)] border-transparent hover:text-[var(--color-text-2)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-start gap-3 mb-5">
        <DateRangeFilter value={dateRange} onChange={handleRangeChange} />
        <div className="flex items-center gap-2 ml-auto">
          {activeTab !== 'patients' && (
            <DoctorFilter doctors={doctors} value={doctorId} onChange={setDoctorId} />
          )}
          {(activeTab === 'appointments' || activeTab === 'revenue' || activeTab === 'patients') && (
            <ExportButton
              reportType={exportType}
              from={dateRange.from}
              to={dateRange.to}
              doctorId={doctorId}
            />
          )}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="flex justify-center py-12">
          <svg className="animate-spin w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="4"/>
            <path fill="currentColor" fillOpacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      )}

      {/* Appointments tab */}
      {!loading && activeTab === 'appointments' && (
        <>
          <ReportSection title="Appointment Summary">
            {appointmentsData ? (
              <AppointmentSummaryCard
                summary={appointmentsData.summary}
                byDoctor={appointmentsData.byDoctor}
                doctorFiltered={!!doctorId}
              />
            ) : (
              <EmptyState />
            )}
          </ReportSection>

          <ReportSection title="No-Show Trend — Last 7 Days">
            {noshowData ? (
              <NoShowTrendChart trend={noshowData.trend} />
            ) : (
              <EmptyState />
            )}
          </ReportSection>
        </>
      )}

      {/* Revenue tab */}
      {!loading && activeTab === 'revenue' && (
        <>
          <ReportSection title="Revenue Summary">
            {revenueData ? (
              <RevenueSummaryCard
                summary={revenueData.summary}
                byDoctor={revenueData.byDoctor}
                doctorFiltered={!!doctorId}
              />
            ) : (
              <EmptyState />
            )}
          </ReportSection>

          {revenueData && revenueData.byDay.length > 0 && (
            <ReportSection
              title={`Revenue by ${revenueData.groupedByWeek ? 'Week' : 'Day'}`}
              action={<span className="text-xs text-[var(--color-text-3)]">In ₹</span>}
            >
              <RevenueByDayChart data={revenueData.byDay} groupedByWeek={revenueData.groupedByWeek} />
            </ReportSection>
          )}

          <ReportSection title="Booking Source Breakdown">
            {bookingSourceData ? (
              <BookingSourceChart sources={bookingSourceData.sources} />
            ) : (
              <EmptyState />
            )}
          </ReportSection>
        </>
      )}

      {/* Doctors tab */}
      {!loading && activeTab === 'doctors' && (
        <ReportSection title="Doctor Utilisation">
          {utilisationData ? (
            <DoctorUtilisationTable
              byDoctor={utilisationData.byDoctor}
              clinicAvgPct={utilisationData.clinicAvgPct}
            />
          ) : (
            <EmptyState />
          )}
        </ReportSection>
      )}

      {/* Patients tab */}
      {!loading && activeTab === 'patients' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <ReportSection title="Patient Growth">
              {patientGrowthData ? (
                <PatientGrowthChart
                  data={patientGrowthData.byPeriod}
                  groupedByMonth={patientGrowthData.groupedByMonth}
                />
              ) : (
                <EmptyState />
              )}
            </ReportSection>

            <ReportSection title="New vs Returning Patients">
              {patientGrowthData ? (
                <NewReturningDonut
                  newPatients={patientGrowthData.summary.newPatients}
                  returningPatients={patientGrowthData.summary.returningPatients}
                  totalUnique={patientGrowthData.summary.totalUnique}
                  newPct={patientGrowthData.summary.newPct}
                  returningPct={patientGrowthData.summary.returningPct}
                />
              ) : (
                <EmptyState />
              )}
            </ReportSection>
          </div>
        </>
      )}
    </div>
  )
}

function EmptyState() {
  return <p className="text-sm text-[var(--color-text-3)] text-center py-8">Loading...</p>
}
