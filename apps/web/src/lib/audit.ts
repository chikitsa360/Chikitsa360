import { db } from './db'

export type AuditAction =
  | 'VIEW_PATIENT'
  | 'MODIFY_PATIENT'
  | 'CREATE_APPOINTMENT'
  | 'MODIFY_APPOINTMENT'
  | 'CANCEL_APPOINTMENT'
  | 'VIEW_BILLING'
  | 'CREATE_BILLING'
  | 'ADD_VISIT_NOTE'
  | 'INVITE_STAFF'
  | 'REMOVE_STAFF'
  | 'EXPORT_DATA'
  | 'LOGIN'
  | 'LOGOUT'
  | 'SETTINGS_CHANGE'
  | 'EVENT_CREATED'
  | 'EVENT_UPDATED'
  | 'EVENT_PUBLISHED'
  | 'EVENT_CANCELLED'
  | 'ATTENDANCE_MARKED'
  | 'REGISTRANT_REMOVED'
  | 'WAITLIST_PROMOTED'
  | 'WAITLIST_REMOVED'
  | 'EVENT_AUTO_COMPLETED'
  | 'ERASE_PATIENT'

export interface AuditLogParams {
  clinicId: string
  userId: string
  action: AuditAction
  resourceType: string
  resourceId?: string
  metadata?: Record<string, unknown>
}

/**
 * Write an immutable audit log entry.
 * Synchronous within the request — must complete before response is sent.
 * Uses INSERT-only privileges on audit.audit_logs (CR-12).
 */
export async function writeAuditLog(params: AuditLogParams): Promise<void> {
  const { clinicId, userId, action, resourceType, resourceId, metadata } = params

  await db.$executeRaw`
    INSERT INTO audit.audit_logs (clinic_id, user_id, action, resource_type, resource_id, metadata)
    VALUES (
      ${clinicId}::uuid,
      ${userId}::uuid,
      ${action},
      ${resourceType},
      ${resourceId ?? null},
      ${metadata ? JSON.stringify(metadata) : null}::jsonb
    )
  `
}
