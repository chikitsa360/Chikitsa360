---
story: 11.3
epic: 11
title: Data Export & Super Admin Plan Management
status: Not Started
created: 2026-06-07
requirements:
  compliance: [CR-13]
  monetisation: [MON-1]
  ux: [UX-DR27]
---

# Story 11.3: Data Export & Super Admin Plan Management

## User Story

As a Clinic Owner,
I want to export all my clinic's data as downloadable files,
So that I can exercise my DPDP Act data portability right and maintain my own backup of the clinic's records.

As a Platform Super Admin,
I want to view and manage clinic subscriptions from an admin panel,
So that I can manually update plans and monitor the platform's clinic base.

## Context

**CR-13:** Data portability — Clinic Owner can export all clinic data. Export includes: patients, appointments, billing records.

**MON-1:** Super Admin can view clinic list and plan status, manually update plan tier and expiry.

**Data export scope:** All data for the clinic tenant — `patients`, `appointments` (with billing fields), `slot_blocks`. Does NOT include: audit_logs (platform-internal), conversation state (ephemeral Redis).

**Export format:** ZIP containing CSV files per entity. UTF-8 with BOM. Same encoding as Story 10.3 exports.

**Super Admin access:** `/admin` route group, protected by `users.system_role = 'super_admin'` check at middleware. Separate from all clinic-level RBAC.

## Acceptance Criteria

### Data Export (CR-13)

**Given** a Clinic Owner navigates to Settings → Data Rights,
**When** the "Clinic Data Export" section renders,
**Then** it shows: "Export all your clinic data as CSV files (patients, appointments, billing). Your data is yours." and an "Export All Data" button.

**Given** the Owner clicks "Export All Data",
**When** the export is triggered,
**Then** a confirmation: "We'll prepare your data export and send you a download link. This may take a few minutes." with "Start Export" and "Cancel" buttons.
**And** on "Start Export": an Inngest job `clinic/data-export.generate` is enqueued with `{ clinicId, requestedBy: userId }`.

**Given** the Inngest export job runs,
**When** it processes,
**Then** it queries `clinic_{clinicId}.patients`, `clinic_{clinicId}.appointments` (with consultation_fee, payment_status), `clinic_{clinicId}.slot_blocks`.
**And** generates three CSV files:
  - `patients.csv`: id, name, phone, dob, gender, reason_for_first_visit, booking_source, created_at
  - `appointments.csv`: id, patient_id, patient_name, patient_phone, doctor_id, doctor_name, slot_date, slot_time, status, booking_source, token_number, consultation_fee, payment_status, visit_note, created_at, cancelled_at
  - `slot_blocks.csv`: id, doctor_id, date, start_time, end_time, recurrence, reason, created_at
**And** all CSVs use UTF-8 with BOM.
**And** packages all three files into a ZIP: `{clinic-slug}-data-export-{YYYY-MM-DD}.zip`.
**And** uploads the ZIP to Vercel Blob with a signed URL (72-hour expiry — longer than report exports due to compliance nature).
**And** stores the download link in `clinics.last_export_url` + `clinics.last_export_expires_at`.
**And** sends an in-app notification to the Owner: "Your data export is ready. [Download] — link expires in 72 hours."
**And** the export job completes within 5 minutes for a clinic with up to 5,000 patients and 50,000 appointments.

**Given** the Owner clicks the download notification link,
**When** the signed URL is accessed,
**Then** the ZIP file downloads to the browser.
**And** if the link has expired (> 72 hours), the page shows: "This download link has expired. Please request a new export from Settings → Data Rights."

**Given** the Owner navigates to Settings → Data Rights after a completed export,
**When** the section renders,
**Then** it shows the last export date: "Last exported: {date}. [Download again]" (if link still valid) or "Last exported: {date}. [Request new export]" (if expired).
**And** the Owner can request a new export at any time (no rate limit at MVP — one export at a time; subsequent requests overwrite `last_export_url`).

**Given** the export job fails (storage error, query timeout),
**When** the Inngest job fails after retries,
**Then** the Owner receives an in-app notification: "Data export failed. Please try again."
**And** failure logged in audit_logs.

### Super Admin Panel (MON-1)

**Given** a user with `system_role = 'super_admin'` navigates to `/admin`,
**When** the admin panel loads,
**Then** it shows a list of all registered clinics: Clinic Name | Owner Email | Plan | Expiry Date | Doctor Count | Status (Active/Expiring/Expired).
**And** clinics are paginated (25 per page), sortable by name and expiry date.
**And** a search input filters by clinic name or owner email.

**Given** a Super Admin clicks on a clinic in the list,
**When** the clinic detail panel opens,
**Then** it shows: Clinic name, slug, owner name + email, plan, `plan_expires_at`, `doctor_limit`, current doctor count, creation date.
**And** editable fields: Plan (dropdown: trial / basic / pro) and Expiry Date (date picker) and Doctor Limit (numeric).
**And** a "Save Changes" button.

**Given** the Super Admin changes a clinic's plan and clicks "Save Changes",
**When** `PATCH /api/admin/clinics/{clinicId}` runs,
**Then** `clinics.plan`, `clinics.plan_expires_at`, `clinics.doctor_limit` are updated.
**And** audit log: `{ action: 'admin-plan-change', clinicId, oldPlan, newPlan, oldExpiry, newExpiry, actorId (super admin userId), timestamp }`.
**And** success toast: "Plan updated for {ClinicName}."
**And** the clinic's expiry warning banner updates in real time on their next page load (no Pusher needed — checked per-request).

**Given** a regular clinic Owner or Receptionist navigates to `/admin`,
**When** the middleware checks `users.system_role`,
**Then** they are redirected to `/dashboard` with no error message (silent redirect — do not reveal the admin panel exists).

**Given** the Super Admin panel lists clinics,
**When** the list renders,
**Then** clinics in "Expiring" state (≤ 7 days) are highlighted with amber row background.
**And** clinics in "Expired" state have red row background.
**And** Active clinics have default white background.

## UX Design Reference

**EXPERIENCE.md — Data Rights settings (UX-DR27):**
> Settings → Data Rights has two sections stacked:
> 1. Patient Data Erasure (Story 11.2)
> 2. Clinic Data Export — "Export all your clinic data" description + "Export All Data" button (ghost style with download icon). Below the button, last export metadata (date + re-download link if valid).

**DESIGN.md — Super Admin panel:**
- Admin panel uses the same portal shell but with a distinct "Admin" badge in the header replacing the clinic name
- Clinic list: standard data table (same design as patient directory — borderless rows, 14px Inter)
- Expiring row: `bg-amber-50`; expired row: `bg-red-50`
- Plan badge chips: same design as template status chips (green=active, amber=expiring, red=expired)
- Clinic detail panel: right-side panel (420px), same shell as other detail panels

## File Locations

```
apps/web/
  src/
    middleware.ts                           ← Extended: /admin routes check system_role = 'super_admin'
    app/
      admin/
        page.tsx                            ← Super Admin clinic list
        AdminClient.tsx                     ← Client: search + paginated clinic table
        [clinicId]/
          AdminClinicPanel.tsx              ← Clinic detail + plan edit
      api/
        admin/
          clinics/
            route.ts                        ← GET: all clinics (super admin only)
            [clinicId]/
              route.ts                      ← PATCH: update plan/expiry/limit (super admin only)
        v1/
          clinics/
            [clinicId]/
              export/
                route.ts                    ← POST: trigger data export job (Owner only)
    components/
      settings/
        DataExportSection.tsx               ← Export CTA + last export metadata
      admin/
        ClinicTable.tsx                     ← Paginated clinic list with status colouring
        ClinicDetailPanel.tsx               ← Plan edit form
    inngest/
      functions/
        clinic-data-export.ts               ← Generate ZIP, upload, notify Owner
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Export CSV: patients.csv contains all expected columns | 100% |
| Unit | Export ZIP: all three CSVs included | 100% |
| Unit | Export: erased patients (name='Deleted Patient') included as anonymised — not skipped | 100% |
| Unit | Super Admin route: system_role != 'super_admin' → redirect (not 403) | 100% |
| Integration | POST /clinics/{id}/export: Inngest job enqueued; notification created on complete | 100% |
| Integration | Export ZIP uploaded to blob; signed URL has 72h expiry | 100% |
| Integration | PATCH /admin/clinics/{id}: plan updated + audit log written | 100% |
| Integration | PATCH /admin/clinics/{id}: 403 for non-super-admin session | 100% |
| Integration | Export job: completes within 5 min for 5,000 patients + 50,000 appointments | Performance |
| Playwright (E2E) | Owner: click Export → confirmation → start → notification → download ZIP | Core path |
| Playwright | Super Admin: view clinic list → click clinic → update plan → toast shown | Core path |
| Playwright | Regular Owner accessing /admin → silently redirected to /dashboard | Core path |
| Playwright | Export link expired: page shows "link expired" message with re-export CTA | Core path |
