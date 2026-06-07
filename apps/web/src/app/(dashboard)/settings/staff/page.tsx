import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/rbac'
import { getTranslations } from 'next-intl/server'
import { UserRole } from '@prisma/client'
import { StaffPageClient } from './StaffPageClient'

export default async function StaffPage() {
  const session = await auth()

  if (!session?.user?.clinicId) {
    redirect('/login')
  }

  // TypeScript flow narrowing after redirect
  const clinicId = session!.user.clinicId!
  const userId = session!.user.id
  const userRole = session!.user.role as UserRole

  if (!hasPermission(userRole, 'staff:read')) {
    redirect('/dashboard')
  }

  const [staff, pendingInvites, clinic] = await Promise.all([
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
      select: { name: true, plan: true },
    }),
  ])

  const doctorCount = staff.filter((s: { role: string }) => s.role === 'DOCTOR').length

  const t = await getTranslations('staff')

  return (
    <StaffPageClient
      staff={staff.map((s: { id: string; name: string | null; phone: string; role: UserRole; createdAt: Date }) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        role: s.role as 'OWNER' | 'DOCTOR' | 'RECEPTIONIST',
        createdAt: s.createdAt.toISOString(),
        status: 'active' as const,
      }))}
      pendingInvites={pendingInvites.map((i: { id: string; phone: string; role: UserRole; createdAt: Date; expiresAt: Date }) => ({
        id: i.id,
        phone: i.phone,
        role: i.role as 'DOCTOR' | 'RECEPTIONIST',
        createdAt: i.createdAt.toISOString(),
        expiresAt: i.expiresAt.toISOString(),
        status: 'pending' as const,
      }))}
      currentUserId={userId}
      clinicName={clinic?.name ?? ''}
      clinicPlan={clinic?.plan ?? 'STARTER'}
      currentDoctorCount={doctorCount}
      canManageStaff={hasPermission(userRole, 'staff:invite')}
      pageTitle={t('title')}
    />
  )
}
