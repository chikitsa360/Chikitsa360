# Deferred Work

## Deferred from: code review of story-11-01-subscription-enforcement-and-soft-paywall (2026-06-11)

- **Migration re-run resets null-expiry accounts**: `UPDATE "clinics" SET plan_expires_at = NOW()+14d WHERE plan_expires_at IS NULL` will re-set deliberately-nulled (support-cleared) accounts if the migration is ever replayed. Low production risk but affects staging/test environments and manual support interventions.
- **TOCTOU race — plan expiry between check and insert**: The plan expiry check in `POST /api/v1/appointments` is followed by several async DB queries before the appointment INSERT. A plan could expire in that window. Acceptable MVP risk given the millisecond exposure.
- **Doctor limit fallback: `clinic.plan` may be null**: In `staff/route.ts`, the fallback path `getDoctorLimit(clinic?.plan ?? 'STARTER')` assumes `plan` is always set. The schema has no NOT NULL constraint on `plan`. If null, the fallback uses STARTER defaults, which may be wrong. Pre-existing schema gap.
