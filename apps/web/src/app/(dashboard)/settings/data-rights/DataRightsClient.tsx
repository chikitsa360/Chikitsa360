'use client'

import * as React from 'react'
import { PatientErasureSearch } from '@/components/settings/PatientErasureSearch'
import { ErasureConfirmDialog } from '@/components/settings/ErasureConfirmDialog'
import { DataExportSection } from '@/components/settings/DataExportSection'
import { useToast } from '@/components/ui/ToastProvider'

interface PatientToErase {
  id: string
  name: string
  phone: string | null
}

interface DataRightsClientProps {
  clinicId: string
  lastExportUrl: string | null
  lastExportExpiresAt: string | null
}

export function DataRightsClient({ clinicId, lastExportUrl, lastExportExpiresAt }: DataRightsClientProps) {
  const { addToast } = useToast()
  const [pendingErasure, setPendingErasure] = React.useState<PatientToErase | null>(null)
  const [erasedIds, setErasedIds] = React.useState<Set<string>>(new Set())

  async function handleConfirmErasure(patientId: string) {
    const res = await fetch(`/api/v1/patients/${patientId}/erase`, { method: 'POST' })
    if (!res.ok) {
      addToast({ variant: 'error', message: 'Erasure failed. Please try again.' })
      return
    }
    setErasedIds((prev) => new Set([...prev, patientId]))
    setPendingErasure(null)
    addToast({ variant: 'success', message: 'Patient data erased. Personal information has been anonymised.' })
  }

  return (
    <>
      <ErasureConfirmDialog
        patient={pendingErasure}
        onConfirm={handleConfirmErasure}
        onClose={() => setPendingErasure(null)}
      />

      {/* Clinic Data Export Section */}
      <div className="mb-6">
        <DataExportSection
          clinicId={clinicId}
          lastExportUrl={lastExportUrl}
          lastExportExpiresAt={lastExportExpiresAt}
        />
      </div>

      {/* Patient Data Erasure Section */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-[15px] font-semibold text-foreground">Patient Data Erasure (DPDP Act)</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Under India&apos;s Digital Personal Data Protection Act 2023, patients have the right to request
          erasure of their personal information. Erasure anonymises all PII; appointment history is retained
          for audit purposes. This action is irreversible.
        </p>

        <div className="mt-4">
          <PatientErasureSearch onErase={setPendingErasure} erasedIds={erasedIds} />
        </div>
      </section>
    </>
  )
}
