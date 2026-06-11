import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { DataRightsClient } from './DataRightsClient'

/**
 * Settings → Data Rights (Story 11.2 + 11.3, CR-3).
 * Owner-only: patient data erasure (DPDP Act) + clinic data export.
 */
export default async function DataRightsPage() {
  const session = await auth()
  if (!session?.user?.clinicId) redirect('/login')

  const isOwner = session.user.role === 'OWNER'

  let lastExportUrl: string | null = null
  let lastExportExpiresAt: string | null = null

  if (isOwner) {
    const clinic = await db.clinic.findUnique({
      where: { id: session.user.clinicId },
      select: { lastExportUrl: true, lastExportExpiresAt: true },
    })
    lastExportUrl = clinic?.lastExportUrl ?? null
    lastExportExpiresAt = clinic?.lastExportExpiresAt?.toISOString() ?? null
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-foreground">Data Rights</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Manage patient data erasure requests and export your clinic data.
        </p>
      </div>

      {!isOwner ? (
        <div className="rounded-lg border border-border bg-card px-5 py-6 text-[14px] text-muted-foreground">
          Data erasure can only be performed by Clinic Owners.
        </div>
      ) : (
        <DataRightsClient
          clinicId={session.user.clinicId}
          lastExportUrl={lastExportUrl}
          lastExportExpiresAt={lastExportExpiresAt}
        />
      )}
    </div>
  )
}
