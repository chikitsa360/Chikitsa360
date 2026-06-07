import { UserRole } from '@prisma/client'

// ── Permission matrix ─────────────────────────────────────────────────────

export type Permission =
  | 'appointments:read:all'
  | 'appointments:read:own'
  | 'appointments:write'
  | 'patients:read:all'
  | 'patients:read:own'
  | 'patients:write'
  | 'billing:read'
  | 'billing:write'
  | 'reports:read'
  | 'settings:clinic'
  | 'staff:read'
  | 'staff:invite'
  | 'staff:remove'
  | 'visit-notes:read:all'
  | 'visit-notes:read:own'
  | 'visit-notes:write:own'

const PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    'appointments:read:all',
    'appointments:write',
    'patients:read:all',
    'patients:write',
    'billing:read',
    'billing:write',
    'reports:read',
    'settings:clinic',
    'staff:read',
    'staff:invite',
    'staff:remove',
    'visit-notes:read:all',
    'visit-notes:write:own',
  ],
  DOCTOR: [
    'appointments:read:own',
    'appointments:write',
    'patients:read:own',
    'patients:write',
    'reports:read',
    'visit-notes:read:own',
    'visit-notes:write:own',
  ],
  RECEPTIONIST: [
    'appointments:read:all',
    'appointments:write',
    'patients:read:all',
    'patients:write',
    'reports:read',
  ],
}

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return PERMISSIONS[role]?.includes(permission) ?? false
}

export function getPermissions(role: UserRole): Permission[] {
  return PERMISSIONS[role] ?? []
}

// ── Plan-based doctor limits ──────────────────────────────────────────────

const DOCTOR_LIMITS: Record<string, number> = {
  STARTER: 1,
  GROWTH: 3,
  PRO: 10,
}

export function getDoctorLimit(plan: string): number {
  return DOCTOR_LIMITS[plan] ?? 1
}

// ── API RBAC helper ────────────────────────────────────────────────────────

interface SessionContext {
  userId: string
  clinicId: string
  role: UserRole
}

export function requirePermission(session: SessionContext, permission: Permission): void {
  if (!hasPermission(session.role, permission)) {
    const err = new Error('Insufficient permissions') as Error & { statusCode: number }
    err.statusCode = 403
    throw err
  }
}

export function isRbacError(err: unknown): err is Error & { statusCode: number } {
  return err instanceof Error && 'statusCode' in err
}
