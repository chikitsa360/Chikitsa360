'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { DayView } from '@/components/appointments/DayView'
import { WeekView } from '@/components/appointments/WeekView'
import { DateNavigator } from '@/components/appointments/DateNavigator'
import { AppointmentDetailPanel } from '@/components/appointments/AppointmentDetailPanel'
import { NewAppointmentPanel } from '@/components/appointments/NewAppointmentPanel'
import { WalkInPanel } from '@/components/appointments/WalkInPanel'
import { useAppointmentUpdates } from '@/lib/pusher/useAppointmentUpdates'

export interface Appointment {
  id: string
  patient_name: string
  patient_phone: string
  doctor_id: string
  doctor_name: string
  status: string
  token_number: number | null
  booking_source: string
  appointment_date: string
  appointment_time: string | null
  consultation_fee: number | null
  payment_status: 'paid' | 'unpaid'
}

export interface Doctor {
  id: string
  name: string
  speciality: string | null
  default_fee: number | null
}

interface CalendarClientProps {
  clinicId: string
  userId: string
  userRole: string
  initialDate: string
  initialView: 'day' | 'week'
  initialAppointments: Appointment[]
  doctors: Doctor[]
}

export function CalendarClient({
  clinicId,
  userId: _userId,
  userRole: _userRole,
  initialDate,
  initialView,
  initialAppointments,
  doctors,
}: CalendarClientProps) {
  const router = useRouter()

  const [currentDate, setCurrentDate] = React.useState(initialDate)
  const [view, setView] = React.useState<'day' | 'week'>(initialView)
  const [appointments, setAppointments] = React.useState<Appointment[]>(initialAppointments)
  const [loading, setLoading] = React.useState(false)
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null)
  const [showNewPanel, setShowNewPanel] = React.useState(false)
  const [showWalkIn, setShowWalkIn] = React.useState(false)
  const [liveUpdateCount, setLiveUpdateCount] = React.useState(0)

  // Track if this is initial load (suppress animations)
  const isInitialLoad = React.useRef(true)

  // ─── Fetch appointments for a date ──────────────────────────────────────────
  const fetchAppointments = React.useCallback(
    async (date: string) => {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/appointments?date=${date}`)
        if (res.ok) {
          const data = (await res.json()) as { appointments: Appointment[] }
          setAppointments(data.appointments)
        }
      } catch { /* ignore */ }
      setLoading(false)
    },
    []
  )

  // ─── Real-time updates via Pusher ────────────────────────────────────────────
  useAppointmentUpdates(clinicId, {
    onAppointmentCreated: () => {
      if (!isInitialLoad.current) setLiveUpdateCount((n) => n + 1)
      void fetchAppointments(currentDate)
    },
    onAppointmentUpdated: () => {
      void fetchAppointments(currentDate)
    },
    onAppointmentCancelled: () => {
      void fetchAppointments(currentDate)
    },
    onSlotBlocked: () => {
      void fetchAppointments(currentDate)
    },
    onSlotUnblocked: () => {
      void fetchAppointments(currentDate)
    },
  })

  // Mark initial load done after mount
  React.useEffect(() => {
    isInitialLoad.current = false
  }, [])

  // ─── Date navigation ─────────────────────────────────────────────────────────
  function navigateDate(direction: -1 | 0 | 1) {
    const [y, m, d] = currentDate.split('-').map(Number)
    const dt = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1)
    if (direction === 0) {
      const today = new Date()
      const todayIST = new Date(today.getTime() + 5.5 * 60 * 60 * 1000)
      const newDate = todayIST.toISOString().split('T')[0] as string
      setCurrentDate(newDate)
      router.replace(`/appointments?date=${newDate}&view=${view}`, { scroll: false })
      void fetchAppointments(newDate)
    } else {
      dt.setDate(dt.getDate() + direction)
      const newDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      setCurrentDate(newDate)
      router.replace(`/appointments?date=${newDate}&view=${view}`, { scroll: false })
      void fetchAppointments(newDate)
    }
  }

  function handleDayClick(date: string) {
    setCurrentDate(date)
    setView('day')
    router.replace(`/appointments?date=${date}&view=day`, { scroll: false })
    void fetchAppointments(date)
  }

  function handleViewChange(newView: 'day' | 'week') {
    setView(newView)
    router.replace(`/appointments?date=${currentDate}&view=${newView}`, { scroll: false })
  }

  // ─── Appointment actions ──────────────────────────────────────────────────────
  async function handleReschedule(appointmentId: string, newDate: string, newTime: string) {
    const res = await fetch(`/api/v1/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reschedule', newDate, newTime }),
    })
    if (res.ok) {
      setSelectedAppointment(null)
      void fetchAppointments(currentDate)
    }
    return res
  }

  async function handleCancel(appointmentId: string) {
    const res = await fetch(`/api/v1/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    })
    if (res.ok) {
      setSelectedAppointment(null)
      void fetchAppointments(currentDate)
    }
    return res
  }

  async function handleMarkComplete(appointmentId: string) {
    const res = await fetch(`/api/v1/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-complete' }),
    })
    if (res.ok) {
      setSelectedAppointment(null)
      void fetchAppointments(currentDate)
    }
    return res
  }

  async function handleMarkNoShow(appointmentId: string) {
    const res = await fetch(`/api/v1/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-no-show' }),
    })
    if (res.ok) {
      setSelectedAppointment(null)
      void fetchAppointments(currentDate)
    }
    return res
  }

  // Count confirmed + completed + no-show for the title
  const activeCount = appointments.filter(
    (a) => a.status === 'confirmed' || a.status === 'completed' || a.status === 'no-show'
  ).length

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-foreground">
            {activeCount} appointment{activeCount !== 1 ? 's' : ''} today
          </h1>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {/* View switcher */}
          <div className="flex overflow-hidden rounded-lg border border-border">
            <button
              onClick={() => handleViewChange('day')}
              className={`px-3 h-8 text-[12px] font-medium transition-colors ${
                view === 'day'
                  ? 'bg-primary text-white'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => handleViewChange('week')}
              className={`px-3 h-8 text-[12px] font-medium border-l border-border transition-colors ${
                view === 'week'
                  ? 'bg-primary text-white'
                  : 'bg-card text-muted-foreground hover:bg-muted'
              }`}
            >
              Week
            </button>
          </div>

          {/* Walk-In button (amber) */}
          <button
            onClick={() => setShowWalkIn(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 text-[12px] font-medium hover:bg-amber-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M16 11l-4 4-2-2" /><circle cx="12" cy="8" r="3" /><path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
            </svg>
            Walk-In
          </button>

          {/* New Appointment button */}
          <button
            onClick={() => setShowNewPanel(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-white text-[12px] font-medium hover:bg-primary/90 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Appointment
          </button>
        </div>
      </div>

      {/* Date navigator */}
      <DateNavigator
        currentDate={currentDate}
        onPrev={() => navigateDate(-1)}
        onNext={() => navigateDate(1)}
        onToday={() => navigateDate(0)}
      />

      {/* Calendar body */}
      <div className="relative mt-3 flex-1">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50">
            <svg className="h-6 w-6 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
        )}

        {view === 'day' ? (
          <DayView
            date={currentDate}
            appointments={appointments}
            onAppointmentClick={setSelectedAppointment}
            onNewAppointment={() => setShowNewPanel(true)}
            liveUpdateCount={liveUpdateCount}
          />
        ) : (
          <WeekView
            currentDate={currentDate}
            clinicId={clinicId}
            onDayClick={handleDayClick}
          />
        )}
      </div>

      {/* Appointment detail panel */}
      {selectedAppointment && (
        <AppointmentDetailPanel
          appointment={selectedAppointment}
          clinicId={clinicId}
          doctorDefaultFee={doctors.find((d) => d.id === selectedAppointment.doctor_id)?.default_fee ?? null}
          onClose={() => setSelectedAppointment(null)}
          onReschedule={handleReschedule}
          onCancel={handleCancel}
          onMarkComplete={handleMarkComplete}
          onMarkNoShow={handleMarkNoShow}
          onBillingSaved={(fee, ps) => {
            setSelectedAppointment((prev) =>
              prev ? { ...prev, consultation_fee: fee, payment_status: ps } : null
            )
            setAppointments((prev) =>
              prev.map((a) =>
                a.id === selectedAppointment.id
                  ? { ...a, consultation_fee: fee, payment_status: ps }
                  : a
              )
            )
          }}
        />
      )}

      {/* New appointment panel */}
      {showNewPanel && (
        <NewAppointmentPanel
          clinicId={clinicId}
          doctors={doctors}
          defaultDate={currentDate}
          onClose={() => setShowNewPanel(false)}
          onCreated={() => {
            setShowNewPanel(false)
            void fetchAppointments(currentDate)
          }}
        />
      )}

      {/* Walk-in panel */}
      {showWalkIn && (
        <WalkInPanel
          clinicId={clinicId}
          doctors={doctors}
          onClose={() => setShowWalkIn(false)}
          onCreated={() => {
            setShowWalkIn(false)
            void fetchAppointments(currentDate)
          }}
        />
      )}
    </div>
  )
}
