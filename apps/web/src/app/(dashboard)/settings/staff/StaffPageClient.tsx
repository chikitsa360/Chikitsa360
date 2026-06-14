'use client'

import * as React from 'react'
import { Button } from '@chikitsa360/ui'
import { StaffList, type StaffMember, type PendingInvite } from '@/components/staff/StaffList'
import { InviteStaffModal } from '@/components/staff/InviteStaffModal'
import { RemoveStaffDialog } from '@/components/staff/RemoveStaffDialog'
import { useRouter } from 'next/navigation'

interface StaffPageClientProps {
  staff: StaffMember[]
  pendingInvites: PendingInvite[]
  currentUserId: string
  clinicName: string
  doctorLimit: number
  currentDoctorCount: number
  canManageStaff: boolean
  pageTitle: string
}

export function StaffPageClient({
  staff,
  pendingInvites,
  currentUserId,
  clinicName,
  doctorLimit,
  currentDoctorCount,
  canManageStaff,
  pageTitle,
}: StaffPageClientProps) {
  const router = useRouter()
  const [showInvite, setShowInvite] = React.useState(false)
  const [memberToRemove, setMemberToRemove] = React.useState<StaffMember | null>(null)

  const handleSuccess = () => {
    router.refresh()
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{pageTitle}</h1>
        {canManageStaff && (
          <Button onClick={() => setShowInvite(true)}>
            Invite Staff
          </Button>
        )}
      </div>

      <StaffList
        staff={staff}
        pendingInvites={pendingInvites}
        currentUserId={currentUserId}
        onRemove={setMemberToRemove}
      />

      {showInvite && (
        <InviteStaffModal
          doctorLimit={doctorLimit}
          currentDoctorCount={currentDoctorCount}
          onClose={() => setShowInvite(false)}
          onSuccess={handleSuccess}
        />
      )}

      {memberToRemove && (
        <RemoveStaffDialog
          member={memberToRemove}
          clinicName={clinicName}
          onClose={() => setMemberToRemove(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
