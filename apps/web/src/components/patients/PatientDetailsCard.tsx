'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'
import { useToast } from '@/components/ui/ToastProvider'

interface PatientDetailsCardProps {
  patientId: string
  name: string
  phone: string
  dob: string | null
  gender: string | null
  firstVisitReason: string | null
  bookingSource: string
  createdAt: string
}

type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say'

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not provided'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatSource(src: string): string {
  const map: Record<string, string> = { whatsapp: 'WhatsApp', web: 'Web Booking', portal: 'Manual', manual: 'Manual' }
  return map[src] ?? src
}

const GENDER_LABELS: Record<string, string> = {
  male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Prefer not to say',
}

export function PatientDetailsCard({
  patientId, name, phone, dob, gender, firstVisitReason, bookingSource, createdAt,
}: PatientDetailsCardProps) {
  const { addToast } = useToast()
  const [editing, setEditing] = React.useState(false)
  const [editDob, setEditDob] = React.useState(dob ?? '')
  const [editGender, setEditGender] = React.useState<Gender | ''>(gender as Gender ?? '')
  const [editReason, setEditReason] = React.useState(firstVisitReason ?? '')
  const [saving, setSaving] = React.useState(false)
  const [currentDob, setCurrentDob] = React.useState(dob)
  const [currentGender, setCurrentGender] = React.useState(gender)
  const [currentReason, setCurrentReason] = React.useState(firstVisitReason)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/patients/${patientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dob: editDob || null,
          gender: editGender || null,
          first_visit_reason: editReason || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setCurrentDob(editDob || null)
      setCurrentGender(editGender || null)
      setCurrentReason(editReason || null)
      setEditing(false)
      addToast({ variant: 'success', message: 'Patient profile updated.' })
    } catch {
      addToast({ variant: 'error', message: 'Failed to update profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { label: 'Full Name', value: name },
    { label: 'Mobile Number', value: phone },
    { label: 'Date of Birth', value: formatDate(currentDob) },
    { label: 'Gender', value: currentGender ? (GENDER_LABELS[currentGender] ?? currentGender) : 'Not provided' },
    { label: 'Reason for first visit', value: currentReason ?? 'Not provided' },
    { label: 'Date Registered', value: formatDate(createdAt.split('T')[0] ?? createdAt) },
    { label: 'Registration Source', value: formatSource(bookingSource) },
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[14px] font-semibold text-foreground">Patient Details</h2>
        {!editing && (
          <button
            onClick={() => { setEditDob(currentDob ?? ''); setEditGender(currentGender as Gender ?? ''); setEditReason(currentReason ?? ''); setEditing(true) }}
            className="flex items-center gap-1.5 h-7 rounded-md border border-border px-2.5 text-[12px] text-muted-foreground hover:bg-muted transition-colors"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path strokeLinecap="round" d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Edit Profile
          </button>
        )}
      </div>

      <div className="divide-y divide-border">
        {fields.map((f) => (
          <div key={f.label} className="flex items-start gap-4 py-2.5">
            <div className="w-36 shrink-0 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground pt-0.5">
              {f.label}
            </div>
            <div className="flex-1 text-[14px] text-foreground">{f.value}</div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Date of Birth
            </label>
            <input
              type="date"
              value={editDob}
              onChange={(e) => setEditDob(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Gender
            </label>
            <select
              value={editGender}
              onChange={(e) => setEditGender(e.target.value as Gender | '')}
              className="h-8 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Not provided</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Reason for first visit
            </label>
            <input
              type="text"
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              maxLength={200}
              placeholder="e.g. Routine check-up"
              className="h-8 w-full rounded-md border border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setEditing(false)}
              className="h-8 rounded-md border border-border px-3 text-[12px] text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { void handleSave() }}
              disabled={saving}
              className={cn(
                'h-8 rounded-md bg-primary px-3 text-[12px] font-medium text-white hover:bg-primary/90 transition-colors',
                saving && 'opacity-50 cursor-not-allowed'
              )}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
