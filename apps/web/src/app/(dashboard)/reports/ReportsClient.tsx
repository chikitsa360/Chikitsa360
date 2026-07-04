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
  /** Non-null when logged-in user is a DOCTOR — locks revenue to their own data */
  ownDoctorId?: string | null
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
  revenueUnavailable?: boolean
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

// ── Tab config ──────────────────────────────────────────────────────────────

const OWNER_TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'appointments',
    label: 'Appointments',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    key: 'revenue',
    label: 'Revenue',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    key: 'doctors',
    label: 'Doctors',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    key: 'patients',
    label: 'Patients',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
]

const DOCTOR_TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'revenue',
    label: 'Revenue',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
]

// ── Component ──────────────────────────────────────────────────────────────

export default function ReportsClient({ doctors, ownDoctorId }: ReportsClientProps) {
  const isDoctor = ownDoctorId != null
  const TABS = isDoctor ? DOCTOR_TABS : OWNER_TABS

  const [activeTab, setActiveTab] = useState<Tab>(isDoctor ? 'revenue' : 'appointments')
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetRange('this-month'))
  const [doctorId, setDoctorId] = useState<string | null>(ownDoctorId ?? null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  const [appointmentsData, setAppointmentsData] = useState<AppointmentsData | null>(null)
  const [noshowData, setNoshowData] = useState<NoshowTrendData | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [bookingSourceData, setBookingSourceData] = useState<BookingSourceData | null>(null)
  const [utilisationData, setUtilisationData] = useState<UtilisationData | null>(null)
  const [patientGrowthData, setPatientGrowthData] = useState<PatientGrowthData | null>(null)

  const fetchData = useCallback(async (tab: Tab, range: DateRange, dId: string | null) => {
    setLoading(true)
    setFetchError(false)
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
    } catch {
      setFetchError(true)
    } finally {
      setLoading(false)
    }
  }, [])

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
      <div className="flex border-b-2 border-border mb-5 gap-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTabChange(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold border-b-2 -mb-0.5 transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-start gap-3 mb-5">
        <DateRangeFilter value={dateRange} onChange={handleRangeChange} />
        <div className="flex items-center gap-2 ml-auto">
          {!isDoctor && activeTab !== 'patients' && (
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

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <svg className="animate-spin w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="4"/>
            <path fill="currentColor" fillOpacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      )}

      {/* ── Appointments Tab ─────────────────────────────────────────────── */}
      {!loading && activeTab === 'appointments' && (
        <>
          <ReportSection
            title="Appointment Summary"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            }
          >
            {appointmentsData ? (
              <AppointmentSummaryCard
                summary={appointmentsData.summary}
                byDoctor={appointmentsData.byDoctor}
                doctorFiltered={!!doctorId}
              />
            ) : (
              <EmptyState error={fetchError} />
            )}
          </ReportSection>

          <ReportSection
            title="No-Show Trend &mdash; Last 7 Days"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M3 3v18h18" />
                <path d="M18 9l-5 5-3-3-4 4" />
              </svg>
            }
          >
            {noshowData ? (
              <NoShowTrendChart trend={noshowData.trend} />
            ) : (
              <EmptyState error={fetchError} />
            )}
          </ReportSection>
        </>
      )}

      {/* ── Revenue Tab ──────────────────────────────────────────────────── */}
      {!loading && activeTab === 'revenue' && (
        <>
          <ReportSection
            title="Revenue Summary"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
          >
            {revenueData ? (
              <RevenueSummaryCard
                summary={revenueData.summary}
                byDoctor={revenueData.byDoctor}
                doctorFiltered={!!doctorId}
                revenueUnavailable={revenueData.revenueUnavailable}
              />
            ) : (
              <EmptyState error={fetchError} />
            )}
          </ReportSection>

          {/* Revenue chart + Booking sources — 2-col grid like mockup */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {revenueData && revenueData.byDay.length > 0 && (
              <ReportSection
                className="lg:col-span-2 mb-0"
                title={`Revenue by ${revenueData.groupedByWeek ? 'Week' : 'Day'}`}
                action={<span className="text-xs text-muted-foreground">In \u20B9</span>}
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M3 3v18h18" />
                    <path d="M18 9l-5 5-3-3-4 4" />
                  </svg>
                }
              >
                <RevenueByDayChart data={revenueData.byDay} groupedByWeek={revenueData.groupedByWeek} />
              </ReportSection>
            )}

            <ReportSection
              className="mb-0"
              title="Booking Sources"
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
                </svg>
              }
            >
              {bookingSourceData ? (
                <BookingSourceChart sources={bookingSourceData.sources} />
              ) : (
                <EmptyState error={fetchError} />
              )}
            </ReportSection>
          </div>
        </>
      )}

      {/* ── Doctors Tab ──────────────────────────────────────────────────── */}
      {!loading && activeTab === 'doctors' && (
        <ReportSection
          title="Doctor Utilisation"
          icon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        >
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

      {/* ── Patients Tab ─────────────────────────────────────────────────── */}
      {!loading && activeTab === 'patients' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <ReportSection
            className="lg:col-span-2 mb-0"
            title="Patient Growth"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M3 3v18h18" />
                <path d="M18 9l-5 5-3-3-4 4" />
              </svg>
            }
          >
            {patientGrowthData ? (
              <PatientGrowthChart
                data={patientGrowthData.byPeriod}
                groupedByMonth={patientGrowthData.groupedByMonth}
              />
            ) : (
              <EmptyState error={fetchError} />
            )}
          </ReportSection>

          <ReportSection
            className="mb-0"
            title="New vs Returning"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0110 10" />
              </svg>
            }
          >
            {patientGrowthData ? (
              <NewReturningDonut
                newPatients={patientGrowthData.summary.newPatients}
                returningPatients={patientGrowthData.summary.returningPatients}
                totalUnique={patientGrowthData.summary.totalUnique}
                newPct={patientGrowthData.summary.newPct}
                returningPct={patientGrowthData.summary.returningPct}
              />
            ) : (
              <EmptyState error={fetchError} />
            )}
          </ReportSection>
        </div>
      )}
    </div>
  )
}

function EmptyState({ error }: { error?: boolean }) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
        </div>
        <p className="text-sm text-red-600 font-medium">Failed to load data.</p>
        <p className="text-xs text-muted-foreground">Please try again.</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
        <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path d="M3 3v18h18" />
          <path d="M18 17l-5-5-3 3-4-4" />
        </svg>
      </div>
      <p className="text-sm text-muted-foreground">No data for this period.</p>
    </div>
  )
}
