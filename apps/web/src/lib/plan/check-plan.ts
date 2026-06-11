/**
 * Plan enforcement helpers (Epic 11 — MON-1 through MON-4).
 * These are pure functions that take clinic data — no DB calls.
 */

export type PlanStatus = 'active' | 'expiring_soon' | 'expired'

/** Days before expiry at which the "expiring soon" warning banner shows */
export const EXPIRY_WARNING_DAYS = 7

/**
 * Returns the plan status for a clinic.
 * - 'active': plan is valid and not expiring soon
 * - 'expiring_soon': plan expires within EXPIRY_WARNING_DAYS days
 * - 'expired': plan has already expired
 *
 * If planExpiresAt is null/undefined (legacy records), returns 'active'.
 */
export function getPlanStatus(planExpiresAt: Date | null | undefined): PlanStatus {
  if (!planExpiresAt) return 'active'

  const now = Date.now()
  const expiresMs = planExpiresAt.getTime()

  if (expiresMs <= now) return 'expired'

  const warningThresholdMs = EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000
  if (expiresMs - now <= warningThresholdMs) return 'expiring_soon'

  return 'active'
}

/**
 * Returns true if the clinic's plan has expired.
 */
export function isPlanExpired(planExpiresAt: Date | null | undefined): boolean {
  return getPlanStatus(planExpiresAt) === 'expired'
}

/**
 * Returns true if the clinic has reached its doctor limit.
 * activeDoctorCount = currently active Doctor-role users for the clinic.
 */
export function isDoctorLimitReached(activeDoctorCount: number, doctorLimit: number): boolean {
  return activeDoctorCount >= doctorLimit
}

/**
 * Default plan settings applied to new clinics at signup.
 */
export const TRIAL_DEFAULTS = {
  plan: 'STARTER' as const,
  doctorLimit: 2,
  /** Returns a Date 14 days from now */
  trialExpiresAt: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
}
