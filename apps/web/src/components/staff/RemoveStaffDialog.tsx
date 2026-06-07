'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@chikitsa360/ui'
import { cn } from '@chikitsa360/core'
import type { StaffMember } from './StaffList'
import { useToast } from '@/components/ui/ToastProvider'

interface RemoveStaffDialogProps {
  member: StaffMember
  clinicName: string
  onClose: () => void
  onSuccess: () => void
}

export function RemoveStaffDialog({
  member,
  clinicName,
  onClose,
  onSuccess,
}: RemoveStaffDialogProps) {
  const t = useTranslations('staff')
  const { addToast } = useToast()
  const [loading, setLoading] = React.useState(false)

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleRemove = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/staff?userId=${member.id}`, { method: 'DELETE' })

      if (!res.ok) {
        const data = await res.json()
        addToast({ variant: 'error', message: data?.error?.message ?? 'Failed to remove staff member' })
        return
      }

      addToast({ variant: 'success', message: `${member.name ?? member.phone} has been removed.` })
      onSuccess()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-dialog-title"
        aria-describedby="remove-dialog-desc"
        className={cn(
          'relative z-10 w-full max-w-sm rounded-xl bg-background p-6',
          'shadow-[var(--shadow-modal)] border border-border'
        )}
      >
        <h2 id="remove-dialog-title" className="text-lg font-semibold text-foreground mb-2">
          {t('remove-title')}
        </h2>
        <p id="remove-dialog-desc" className="text-sm text-muted-foreground mb-6">
          {t('remove-confirm', {
            name: member.name ?? member.phone,
            clinic: clinicName,
          })}
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            {t('../../common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleRemove}
            isLoading={loading}
          >
            {t('remove-submit')}
          </Button>
        </div>
      </div>
    </div>
  )
}
