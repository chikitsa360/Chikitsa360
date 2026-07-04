import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/rbac'
import { UserRole } from '@prisma/client'
import { StaffPageClient } from './StaffPageClient'

export default async function StaffPage() {
  const session = await auth()

  if (!session?.user?.clinicId) {
    redirect('/login')
  }

  const clinicId = session!.user.clinicId!
  const userId = session!.user.id
  const userRole = session!.user.role as UserRole

  if (!hasPermission(userRole, 'staff:read')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
          </svg>
        </div>
        <h2 className="text-[16px] font-semibold text-foreground">Owner Access Only</h2>
        <p className="mt-1 text-[13px] text-muted-foreground max-w-xs">
          Staff management can only be accessed by the clinic owner.
        </p>
      </div>
    )
  }

  let staff: { id: string; name: string | null; phone: string; role: UserRole; createdAt: Date }[] = []
  let pendingInvites: { id: string; phone: string; role: UserRole; createdAt: Date; expiresAt: Date }[] = []
  let clinic: { name: string; plan: string; doctorLimit: number } | null = null

  try {
    const results = await Promise.all([
      db.user.findMany({
        where: { clinicId },
        select: { id: true, name: true, phone: true, role: true, createdAt: true },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
      }),
      db.staffInvite.findMany({
        where: { clinicId, status: 'PENDING' },
        select: { id: true, phone: true, role: true, createdAt: true, expiresAt: true },
      }),
      db.clinic.findUnique({
        where: { id: clinicId },
        select: { name: true, plan: true, doctorLimit: true },
      }),
    ])
    staff = results[0]
    pendingInvites = results[1]
    clinic = results[2]
  } catch (err) {
    console.error('[StaffPage] Failed to load data:', err)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
          <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4m0 4h.01" />
          </svg>
        </div>
        <h2 className="text-[16px] font-semibold text-foreground">Unable to load staff data</h2>
        <p className="mt-1 text-[13px] text-muted-foreground max-w-xs">
          Please refresh the page to try again.
        </p>
      </div>
    )
  }

  const doctorCount = staff.filter((s) => s.role === 'DOCTOR').length
  const pendingDoctorCount = pendingInvites.filter((i) => i.role === 'DOCTOR').length

  const PLAN_DOCTOR_LIMITS: Record<string, number> = { STARTER: 1, GROWTH: 3, PRO: 10 }
  const effectiveDoctorLimit = clinic?.doctorLimit ?? PLAN_DOCTOR_LIMITS[clinic?.plan ?? 'STARTER'] ?? 1

  return (
    <StaffPageClient
      staff={staff.map((s) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        role: s.role as 'OWNER' | 'DOCTOR' | 'RECEPTIONIST',
        createdAt: s.createdAt.toISOString(),
        status: 'active' as const,
      }))}
      pendingInvites={pendingInvites.map((i) => ({
        id: i.id,
        phone: i.phone,
        role: i.role as 'DOCTOR' | 'RECEPTIONIST',
        createdAt: i.createdAt.toISOString(),
        expiresAt: i.expiresAt.toISOString(),
        status: 'pending' as const,
      }))}
      currentUserId={userId}
      clinicName={clinic?.name ?? ''}
      doctorLimit={effectiveDoctorLimit}
      currentDoctorCount={doctorCount + pendingDoctorCount}
      canManageStaff={hasPermission(userRole, 'staff:invite')}
      pageTitle="Staff Management"
    />
  )
}
