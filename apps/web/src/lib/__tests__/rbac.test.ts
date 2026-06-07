import { describe, it, expect } from 'vitest'
import { hasPermission, getDoctorLimit, requirePermission } from '../rbac'
import type { UserRole } from '@prisma/client'

describe('hasPermission — OWNER', () => {
  it('can read all appointments', () => {
    expect(hasPermission('OWNER', 'appointments:read:all')).toBe(true)
  })
  it('can access billing', () => {
    expect(hasPermission('OWNER', 'billing:read')).toBe(true)
    expect(hasPermission('OWNER', 'billing:write')).toBe(true)
  })
  it('can manage staff', () => {
    expect(hasPermission('OWNER', 'staff:invite')).toBe(true)
    expect(hasPermission('OWNER', 'staff:remove')).toBe(true)
  })
  it('can access clinic settings', () => {
    expect(hasPermission('OWNER', 'settings:clinic')).toBe(true)
  })
})

describe('hasPermission — DOCTOR', () => {
  it('can only read own appointments', () => {
    expect(hasPermission('DOCTOR', 'appointments:read:own')).toBe(true)
    expect(hasPermission('DOCTOR', 'appointments:read:all')).toBe(false)
  })
  it('cannot access billing', () => {
    expect(hasPermission('DOCTOR', 'billing:read')).toBe(false)
    expect(hasPermission('DOCTOR', 'billing:write')).toBe(false)
  })
  it('cannot manage staff', () => {
    expect(hasPermission('DOCTOR', 'staff:invite')).toBe(false)
    expect(hasPermission('DOCTOR', 'staff:remove')).toBe(false)
  })
  it('cannot access clinic settings', () => {
    expect(hasPermission('DOCTOR', 'settings:clinic')).toBe(false)
  })
  it('can add and view own visit notes', () => {
    expect(hasPermission('DOCTOR', 'visit-notes:read:own')).toBe(true)
    expect(hasPermission('DOCTOR', 'visit-notes:write:own')).toBe(true)
  })
})

describe('hasPermission — RECEPTIONIST', () => {
  it('can read all appointments', () => {
    expect(hasPermission('RECEPTIONIST', 'appointments:read:all')).toBe(true)
  })
  it('can read all patients', () => {
    expect(hasPermission('RECEPTIONIST', 'patients:read:all')).toBe(true)
  })
  it('cannot access billing', () => {
    expect(hasPermission('RECEPTIONIST', 'billing:read')).toBe(false)
    expect(hasPermission('RECEPTIONIST', 'billing:write')).toBe(false)
  })
  it('cannot manage staff', () => {
    expect(hasPermission('RECEPTIONIST', 'staff:invite')).toBe(false)
    expect(hasPermission('RECEPTIONIST', 'staff:remove')).toBe(false)
  })
  it('cannot add visit notes', () => {
    expect(hasPermission('RECEPTIONIST', 'visit-notes:write:own')).toBe(false)
  })
  it('cannot access clinic settings', () => {
    expect(hasPermission('RECEPTIONIST', 'settings:clinic')).toBe(false)
  })
})

describe('getDoctorLimit', () => {
  it('returns 1 for STARTER', () => expect(getDoctorLimit('STARTER')).toBe(1))
  it('returns 3 for GROWTH', () => expect(getDoctorLimit('GROWTH')).toBe(3))
  it('returns 10 for PRO', () => expect(getDoctorLimit('PRO')).toBe(10))
  it('returns 1 for unknown plan', () => expect(getDoctorLimit('UNKNOWN')).toBe(1))
})

describe('requirePermission', () => {
  it('does not throw when permission granted', () => {
    expect(() =>
      requirePermission(
        { userId: 'u1', clinicId: 'c1', role: 'OWNER' as UserRole },
        'staff:invite'
      )
    ).not.toThrow()
  })

  it('throws with statusCode 403 when permission denied', () => {
    expect(() =>
      requirePermission(
        { userId: 'u1', clinicId: 'c1', role: 'DOCTOR' as UserRole },
        'billing:read'
      )
    ).toThrow()

    try {
      requirePermission(
        { userId: 'u1', clinicId: 'c1', role: 'DOCTOR' as UserRole },
        'billing:read'
      )
    } catch (err: unknown) {
      expect((err as { statusCode?: number }).statusCode).toBe(403)
    }
  })
})
