'use client'

import * as React from 'react'
import { WorkingHoursForm, type WorkingHoursData } from '@/components/onboarding/WorkingHoursForm'
import { useToast } from '@/components/ui/ToastProvider'

interface Doctor {
  id: string
  name: string
}

interface WorkingHoursRow {
  doctor_id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_duration: number
  lunch_start_time: string | null
  lunch_end_time: string | null
  is_active: boolean
}

export function WorkingHoursSettingsClient() {
  const { addToast } = useToast()
  const [doctors, setDoctors] = React.useState<Doctor[]>([])
  const [activeTab, setActiveTab] = React.useState(0)
  const [workingHoursMap, setWorkingHoursMap] = React.useState<Record<string, WorkingHoursData>>({})
  const [timeErrors, setTimeErrors] = React.useState<Record<string, string>>({})
  const [submitting, setSubmitting] = React.useState(false)
  const [success, setSuccess] = React.useState(false)
  const [serverError, setServerError] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  const [savedHours, setSavedHours] = React.useState<Record<string, Partial<WorkingHoursData>>>({})

  React.useEffect(() => {
    Promise.all([
      fetch('/api/v1/doctors').then((r) => r.json()),
      fetch('/api/v1/working-hours').then((r) => r.json()),
    ])
      .then(([doctorsData, hoursData]: [Doctor[], WorkingHoursRow[]]) => {
        if (Array.isArray(doctorsData)) setDoctors(doctorsData)
        if (Array.isArray(hoursData) && hoursData.length > 0) {
          const grouped: Record<string, WorkingHoursRow[]> = {}
          for (const row of hoursData) {
            const key = row.doctor_id
            if (!grouped[key]) grouped[key] = []
            grouped[key].push(row)
          }
          const map: Record<string, Partial<WorkingHoursData>> = {}
          for (const [doctorId, rows] of Object.entries(grouped)) {
            const activeDays = rows.filter((r) => r.is_active).map((r) => r.day_of_week)
            const first = rows[0]
            const hasLunch = !!(first?.lunch_start_time && first?.lunch_end_time)
            map[doctorId] = {
              doctorId,
              activeDays,
              startTime: first?.start_time ?? '10:00',
              endTime: first?.end_time ?? '19:00',
              slotDuration: first?.slot_duration ?? 20,
              lunchEnabled: hasLunch,
              lunchStartTime: first?.lunch_start_time ?? '13:00',
              lunchEndTime: first?.lunch_end_time ?? '14:00',
            }
          }
          setSavedHours(map)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleWorkingHoursChange = React.useCallback(
    (data: WorkingHoursData) => {
      setWorkingHoursMap((prev) => ({ ...prev, [data.doctorId]: data }))
    },
    []
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errors: Record<string, string> = {}
    for (const [, data] of Object.entries(workingHoursMap)) {
      const sp = data.startTime.split(':').map(Number)
      const ep = data.endTime.split(':').map(Number)
      const sh = sp[0] ?? 0, sm = sp[1] ?? 0
      const eh = ep[0] ?? 0, em = ep[1] ?? 0
      if (eh * 60 + em <= sh * 60 + sm) {
        errors[data.doctorId] = 'End time must be after start time.'
      }
    }
    if (Object.keys(errors).length > 0) {
      setTimeErrors(errors)
      return
    }
    setTimeErrors({})
    setSubmitting(true)
    setSuccess(false)
    setServerError('')

    try {
      const payload: object[] = []
      for (const data of Object.values(workingHoursMap)) {
        for (const day of data.activeDays) {
          payload.push({
            doctorId: data.doctorId,
            dayOfWeek: day,
            startTime: data.startTime,
            endTime: data.endTime,
            slotDuration: data.slotDuration,
            lunchStartTime: data.lunchEnabled ? data.lunchStartTime : null,
            lunchEndTime: data.lunchEnabled ? data.lunchEndTime : null,
            isActive: true,
          })
        }
      }

      const res = await fetch('/api/v1/working-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setServerError(data.error ?? 'Something went wrong.')
        addToast({ variant: 'error', message: 'Failed to save working hours' })
        return
      }

      setSuccess(true)
      addToast({ variant: 'success', message: 'Working hours saved' })
      setTimeout(() => setSuccess(false), 4000)
    } catch {
      setServerError('Something went wrong.')
      addToast({ variant: 'error', message: 'Failed to save working hours' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-[13px] text-muted-foreground">Loading...</div>
  }

  const currentDoctor = doctors[activeTab]

  return (
    <div className="mx-auto max-w-[640px]">
      <div className="mb-6">
        <h1 className="text-[20px] font-bold text-foreground" style={{ letterSpacing: '-0.015em' }}>
          Working Hours
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Changes take effect from tomorrow.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <form onSubmit={handleSubmit} noValidate className="px-6 py-6">
          {/* Doctor tabs */}
          {doctors.length > 1 && (
            <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-border bg-muted p-1">
              {doctors.map((doc, idx) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => setActiveTab(idx)}
                  className="flex-shrink-0 rounded-md px-4 py-2 text-[13px] font-medium transition-colors"
                  style={
                    idx === activeTab
                      ? { background: 'var(--color-card)', color: 'var(--color-foreground)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
                      : { color: 'var(--color-muted-foreground)' }
                  }
                >
                  {doc.name}
                </button>
              ))}
            </div>
          )}

          {currentDoctor ? (
            <WorkingHoursForm
              key={currentDoctor.id}
              doctorId={currentDoctor.id}
              initialData={savedHours[currentDoctor.id]}
              onChange={handleWorkingHoursChange}
              error={timeErrors[currentDoctor.id]}
            />
          ) : (
            <p className="text-[13px] text-muted-foreground">No doctors added yet.</p>
          )}

          {success && (
            <p className="mt-4 rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-[13px] text-success">
              Working hours updated. Changes take effect from tomorrow.
            </p>
          )}
          {serverError && (
            <p className="mt-4 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-[13px] text-error">
              {serverError}
            </p>
          )}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !currentDoctor}
              className="flex h-10 items-center rounded-lg bg-primary px-5 text-[13px] font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
