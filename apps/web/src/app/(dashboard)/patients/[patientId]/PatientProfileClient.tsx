'use client'

import * as React from 'react'
import { PatientHeader } from '@/components/patients/PatientHeader'
import { PatientDetailsCard } from '@/components/patients/PatientDetailsCard'
import { VisitHistoryList } from '@/components/patients/VisitHistoryList'
import { canEditVisitNote } from '@/lib/rbac'
import type { UserRole } from '@prisma/client'

interface PatientProfileClientProps {
  patientId: string
  name: string
  phone: string
  dob: string | null
  gender: string | null
  firstVisitReason: string | null
  bookingSource: string
  createdAt: string
  visitCount: number
  lastVisitDate: string | null
  userRole: string
}

export function PatientProfileClient({
  patientId, name, phone, dob, gender, firstVisitReason,
  bookingSource, createdAt, visitCount, lastVisitDate, userRole,
}: PatientProfileClientProps) {
  const canEdit = canEditVisitNote(userRole as UserRole)

  return (
    <div>
      {/* Patient header */}
      <div className="mb-6 rounded-xl border border-border bg-card p-6">
        <PatientHeader
          name={name}
          phone={phone}
          dob={dob}
          gender={gender}
          visitCount={visitCount}
          lastVisitDate={lastVisitDate}
        />
      </div>

      {/* Two-column layout on desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[35%_1fr]">
        {/* Patient Details */}
        <PatientDetailsCard
          patientId={patientId}
          name={name}
          phone={phone}
          dob={dob}
          gender={gender}
          firstVisitReason={firstVisitReason}
          bookingSource={bookingSource}
          createdAt={createdAt}
        />

        {/* Visit History */}
        <div>
          <h2 className="mb-3 text-[14px] font-semibold text-foreground">Visit History</h2>
          <VisitHistoryList
            patientId={patientId}
            canEditNote={canEdit}
          />
        </div>
      </div>
    </div>
  )
}
