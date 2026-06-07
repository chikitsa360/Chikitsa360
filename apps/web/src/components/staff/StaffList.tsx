'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Avatar, Badge, Button } from '@chikitsa360/ui'
import { cn } from '@chikitsa360/core'
import { formatISTDate } from '@chikitsa360/core'

export interface StaffMember {
  id: string
  name: string | null
  phone: string
  role: 'OWNER' | 'DOCTOR' | 'RECEPTIONIST'
  createdAt: string
  status: 'active'
}

export interface PendingInvite {
  id: string
  phone: string
  role: 'DOCTOR' | 'RECEPTIONIST'
  createdAt: string
  expiresAt: string
  status: 'pending'
}

interface StaffListProps {
  staff: StaffMember[]
  pendingInvites: PendingInvite[]
  currentUserId: string
  onRemove: (member: StaffMember) => void
}

const roleBadgeVariant: Record<string, 'default' | 'success' | 'warning' | 'secondary'> = {
  OWNER: 'default',
  DOCTOR: 'success',
  RECEPTIONIST: 'secondary',
}

export function StaffList({ staff, pendingInvites, currentUserId, onRemove }: StaffListProps) {
  const t = useTranslations('staff')

  const sortedStaff = [...staff].sort((a, b) => {
    const roleOrder = { OWNER: 0, DOCTOR: 1, RECEPTIONIST: 2 }
    const ro = roleOrder[a.role] - roleOrder[b.role]
    if (ro !== 0) return ro
    return (a.name ?? '').localeCompare(b.name ?? '')
  })

  return (
    <div className="space-y-2">
      {/* Active staff */}
      {sortedStaff.map((member) => (
        <div
          key={member.id}
          className={cn(
            'flex items-center gap-4 rounded-lg border border-border bg-background p-4',
            'hover:bg-muted/50 transition-colors'
          )}
        >
          <Avatar name={member.name ?? member.phone} size="md" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">
                {member.name ?? member.phone}
              </span>
              <Badge variant={roleBadgeVariant[member.role]}>{t(`roles.${member.role}`)}</Badge>
              <Badge variant="success">{t('status.active')}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {member.phone} · Joined {formatISTDate(member.createdAt)}
            </p>
          </div>

          {/* Remove button — not shown for self */}
          {member.id !== currentUserId && member.role !== 'OWNER' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(member)}
              className="shrink-0 text-muted-foreground hover:text-red-600"
              aria-label={`Remove ${member.name ?? member.phone}`}
            >
              <TrashIcon />
            </Button>
          )}
        </div>
      ))}

      {/* Pending invites */}
      {pendingInvites.map((invite) => (
        <div
          key={invite.id}
          className="flex items-center gap-4 rounded-lg border border-border bg-background p-4 opacity-75"
        >
          <Avatar name={invite.phone} size="md" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">{invite.phone}</span>
              <Badge variant={roleBadgeVariant[invite.role]}>{t(`roles.${invite.role}`)}</Badge>
              <Badge variant="warning">{t('status.pending')}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Invited {formatISTDate(invite.createdAt)} · Expires {formatISTDate(invite.expiresAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}
