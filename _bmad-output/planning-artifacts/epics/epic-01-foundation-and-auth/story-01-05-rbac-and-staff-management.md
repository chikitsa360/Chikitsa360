---
story: 1.5
epic: 1
title: Role-Based Access Control & Staff Management
status: Not Started
created: 2026-06-07
requirements:
  functional: [FR-33, FR-35]
  monetisation: [MON-2]
  nfr: [NFR-21, NFR-24]
  compliance: [CR-12]
---

# Story 1.5: Role-Based Access Control & Staff Management

## User Story

As a Clinic Owner,
I want to invite Doctors and Receptionists by phone number and manage their access,
So that my team can log in with appropriate role-scoped permissions and I can revoke access instantly when needed.

## Context

**FR-33: Role-based access control — three roles:**

| Capability | Clinic Owner | Doctor | Receptionist |
|---|---|---|---|
| All Appointments (all doctors) | Yes | Own only | Yes |
| Patient Database (all patients) | Yes | Own patients only | Yes |
| Billing records + revenue | Yes | No | No |
| Clinic Settings | Yes | No | No |
| Invite / remove staff | Yes | No | No |
| Add visit notes | Yes | Yes (own appts) | No |
| View visit notes | Yes | Yes (own appts) | No |
| Revenue reports | Yes | No | No |

**FR-35: Staff invitation flow:**
- Owner invites by phone number + role
- Invitee receives WhatsApp setup link
- Link expires 7 days if not accepted
- Removing staff → immediate session revocation
- Doctor count enforced per plan (Starter: 1, Growth: 3, Pro: 10)

**RBAC implementation:**
- JWT session payload: `{ clinicId, userId, role: 'OWNER' | 'DOCTOR' | 'RECEPTIONIST' }`
- API middleware checks role + clinicId BEFORE any DB query
- PostgreSQL RLS is second enforcement layer (defense-in-depth)
- UI conditionally renders by role (never sole guard — only for UX, not security)

**Session revocation:**
- Store `sessionId` in Redis with `{userId}:active-sessions` set
- On staff removal: delete all entries for that `userId` from Redis
- API middleware checks session validity against Redis on every request (fast Redis lookup)

## Acceptance Criteria

**Given** I am logged in as Clinic Owner,
**When** I navigate to Settings → Staff,
**Then** I see:
- A list of all current staff members (name, phone number, role badge, join date, status: Active / Pending)
- An "Invite Staff" button
- A "Remove" action (trash icon) on each staff row
**And** the list is ordered: Owners first, then Doctors, then Receptionists; within each role, alphabetically by name.

**Given** I tap "Invite Staff",
**When** the invite modal opens,
**Then** I can enter a 10-digit mobile number, select a role (Doctor or Receptionist), and confirm.
**And** on confirm, a WhatsApp setup link is sent to the phone number via the Cliniqly WhatsApp Business number.
**And** a `StaffInvite` record is created in the DB with status `pending` and `expires_at = NOW() + 7 days`.
**And** the invitee appears in the staff list as "Pending" with the assigned role shown.

**Given** an invitee receives the WhatsApp setup link and opens it,
**When** they complete phone OTP login,
**Then** their account is linked to the Clinic with the assigned role.
**And** the `StaffInvite` record is updated to `accepted`.
**And** they can immediately access the portal with role-scoped permissions.
**And** they are redirected to the Dashboard (not the onboarding wizard — that's Owner-only).

**Given** an invitation was sent 7 days ago,
**When** the invitee tries to use the link,
**Then** the link resolves to an expired state page: "This invitation has expired. Ask your Clinic Owner to resend it."
**And** no session or user account is created from the expired invite.

**Given** I am on the Starter plan (Doctor limit: 1) and already have 1 Doctor,
**When** I try to invite another Doctor,
**Then** the invite form shows an upgrade prompt: "You've reached your Doctor limit on the Starter plan. Upgrade to Growth to add up to 3 Doctors."
**And** the invite form's "Doctor" role option is disabled; the form cannot be submitted with Doctor role selected.
**And** no `StaffInvite` record is created.

**Given** an active staff member exists,
**When** I click "Remove" on their row and a confirmation modal appears ("Remove [Name] from [Clinic]? They will lose access immediately."),
**And** I confirm by clicking "Remove" in the modal,
**Then** all active sessions for that user at this Clinic are immediately invalidated (Redis session keys deleted).
**And** the user is removed from the clinic's staff list in the DB (soft-delete, preserving historical appointment data).
**And** on their next API request, they receive HTTP 401 and are redirected to `/login`.
**And** the staff list updates within 3 seconds to show the member is removed.

**Given** I cancel the removal confirmation modal,
**When** I click "Cancel" or press Escape,
**Then** no action is taken; the staff member remains active.

**Given** I am logged in as a Doctor,
**When** I attempt to navigate to Settings → Staff or make a `GET /api/v1/staff` API call,
**Then** the Settings → Staff section is absent from the Settings navigation (not rendered in DOM).
**And** the direct API call returns HTTP 403 with `{ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } }`.

**Given** I am logged in as a Receptionist,
**When** I attempt to access any billing API, revenue report, or Clinic Settings,
**Then** the API returns HTTP 403 with no data exposed.
**And** the UI hides those navigation items and pages entirely.

**Given** a Doctor is authenticated,
**When** they call `GET /api/v1/appointments`,
**Then** the response contains only appointments where `doctor_id = {their userId}` — never other doctors' appointments.
**And** this filtering is enforced at the API middleware layer (not just frontend), verified by an integration test that calls the endpoint with a Doctor session and asserts cross-doctor data is absent.

**Given** a Doctor is authenticated,
**When** they call `GET /api/v1/patients`,
**Then** the response contains only patients who have had at least one appointment with that Doctor at this Clinic.
**And** patients who visited only other doctors are absent from the response.

**Given** any staff action on patient data occurs (view patient, modify appointment, export data),
**When** the action completes,
**Then** an audit log entry is written to `audit.audit_logs` with: `clinic_id`, `user_id`, `action` (e.g. `VIEW_PATIENT`, `MODIFY_APPOINTMENT`), `resource_type`, `resource_id`, `created_at`.
**And** the audit log write is synchronous (before response is sent to client).
**And** the audit log cannot be modified or deleted by any clinic role (INSERT-only privileges).

## UX Design Reference

**EXPERIENCE.md — RBAC Model (from Section: Role-Based Access Model):**

The portal renders different navigation and content based on role. Key differences:
- **Clinic Owner:** Sees all nav items; can see all doctors' calendars; sees revenue on dashboard; can access Settings
- **Doctor:** Calendar shows only their own appointments; Patients shows only their own patients; no Billing nav item; no Settings nav item (except personal profile)
- **Receptionist:** Full calendar across all doctors; full patient list; no Billing nav item; no revenue figures on dashboard; no Settings (except personal profile)

**DESIGN.md — Settings page patterns:**
- Settings left sub-nav (within Settings section): Clinic Profile, Working Hours, Doctors, Staff, WhatsApp, Notifications, Data Export
- Staff page: DataTable-style list with avatar, name, phone, role badge, join date, status badge, actions (3-dot menu or icon buttons)
- Invite modal: full-page overlay modal (not drawer), centered, max-width 480px
- Role selector in invite: `Select` component with options "Doctor" and "Receptionist" (Clinic Owner role cannot be invited)
- Confirmation modal for removal: `AlertDialog` pattern — title, consequence description, red "Remove" CTA, grey "Cancel" button

**EXPERIENCE.md — Confirmation patterns:**
- Destructive action confirmation: modal (not inline), explicit consequence description, two buttons (Confirm destructive + Cancel)
- NFR-24: All destructive actions require explicit confirmation step

**DESIGN.md — Role badges:**
- Owner: `bg-primary/10 text-primary` pill
- Doctor: `bg-teal/10 text-teal` pill
- Receptionist: `bg-neutral-100 text-neutral-600` pill
- Pending: `bg-warning/10 text-warning` pill

## File Locations

```
apps/web/
  src/
    app/
      (dashboard)/
        settings/
          staff/
            page.tsx              ← Settings → Staff page
    components/
      staff/
        StaffList.tsx             ← Staff member list with role badges
        InviteStaffModal.tsx      ← Invite form modal
        RemoveStaffDialog.tsx     ← Removal confirmation dialog
    lib/
      rbac.ts                     ← RBAC middleware helper; role permission matrix
      session-store.ts            ← Redis session tracking; revoke function
    middleware.ts                 ← next-auth middleware (updated to include role checks)
    api/
      v1/
        staff/
          route.ts                ← GET (list) + POST (invite) + DELETE (remove)
        invites/
          [token]/
            route.ts              ← GET invite by token (for setup link landing)
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | RBAC permission matrix — all role/capability combinations | 100% of matrix cells |
| Integration (testcontainers) | Doctor API returns own-only appointments; Receptionist cannot access billing; Owner accesses all | 100% of matrix |
| Integration | Session revocation: remove staff → Redis keys deleted → next request returns 401 | 100% |
| Integration | Invite flow: create invite → accept → role assigned; expired invite rejected | Core paths |
| Integration | Plan limit enforcement: Starter + 1 Doctor → invite Doctor blocked | 100% |
| Playwright (E2E) | Owner: invite Doctor → Doctor logs in → sees own-only calendar | Full UJ |
| Playwright | Owner: remove Receptionist → Receptionist session invalidated | Core path |

## Security Notes

- RBAC is enforced at API middleware layer — UI hiding is UX only, not a security boundary
- Session revocation uses Redis `SREM` on `{userId}:sessions` set; all tokens in the set are checked on each request
- Audit logging is synchronous and cannot be bypassed — `audit.ts` helper wraps every protected resource handler
- Doctor's patient scope is enforced via SQL `JOIN appointments WHERE doctor_id = ?` — not post-fetch filtering
- Staff invite tokens use `crypto.randomBytes(32).toString('hex')` — not sequential IDs
