---
story: 6.1
epic: 6
title: Patient Search & Directory
status: review
created: 2026-06-07
baseline_commit: 6385967b1c452cb0c0332f0a6d3762fd489dbbe8
requirements:
  functional: [FR-19, FR-20]
  nfr: [NFR-4, NFR-7]
  ux: [UX-DR33]
  compliance: [CR-4]
---

# Story 6.1: Patient Search & Directory

## User Story

As a Receptionist,
I want to quickly find any patient by their name or phone number,
So that I can pull up their profile and history in under a second without scrolling through a long list.

## Context

**FR-19:** Search by name (partial match, 3+ chars) or mobile number (last 4 digits or full). Results within 1 second for ≤ 5,000 patient records. Scoped strictly to logged-in staff's Clinic Tenant.

**FR-20:** New booking using existing phone number matches existing patient, not create new. Manual entry of duplicate phone by Receptionist surfaces existing patient with confirmation prompt.

**Search scope:** Strictly within `clinic_{clinicId}` schema. A Receptionist at Clinic A cannot find patients of Clinic B — enforced by schema-level tenant isolation.

**Search entry points:**
1. Global search bar in the portal header (always visible — searches patients + appointments)
2. Patients → Directory page (dedicated search + full paginated list)
3. New Appointment panel phone field (Story 5.2 — inline lookup, not full search)

## Acceptance Criteria

**Given** a Receptionist navigates to Patients in the sidebar,
**When** the Patients / Directory page loads,
**Then** a search input is shown at the top: placeholder "Search by name or phone…"
**And** below it, all patients are listed in alphabetical order (paginated, 20 per page) showing: Name, Phone (masked: +91 XXXXXX{last4}), Last Visit Date, Last Doctor.
**And** a total count is shown: "X patients registered".
**And** if no patients exist yet: empty state — "No patients yet. Patients are created automatically when they book via WhatsApp or Web, or you can add one manually."

**Given** a Receptionist types 3 or more characters in the search input,
**When** the search query runs (debounced 300ms),
**Then** `GET /api/v1/patients/search?q={query}&clinicId={clinicId}` is called.
**And** results render within 1 second for a clinic with up to 5,000 patients (NFR-4).
**And** name matching uses case-insensitive partial match (PostgreSQL `ILIKE '%{query}%'` on `name`).
**And** if the query is 10 digits, an exact phone match is also attempted.
**And** if the query is 4 digits or fewer (but the user specifically typed digits), last-4-digit phone match is attempted.
**And** results show: Name (match highlighted), Phone (masked), Last Visit, Last Doctor, "View Profile" button.
**And** if no results: "No patients found for '{query}'." with a "+ Add New Patient" CTA.

**Given** search results are shown,
**When** the Receptionist clicks a patient row or "View Profile",
**Then** they navigate to `/patients/{patientId}` (the full patient profile — Story 6.2).

**Given** a Receptionist enters a phone number that already exists in the clinic's patient DB (e.g. while attempting to add a new patient via the "+ Add Patient" button),
**When** they type the existing phone number,
**Then** a de-duplication prompt appears: "A patient with this number already exists: {Name}, last seen {Date}. View their profile?" with "View Profile" and "Add Anyway (not recommended)" buttons.
**And** "View Profile" navigates to the existing patient's profile.
**And** "Add Anyway" is intentionally de-emphasised (ghost button, smaller text) — it creates a new record only if the Receptionist explicitly chooses it (edge case: legitimate same-phone-number scenario).
**And** if "Add Anyway" is clicked, the new patient is created with a `duplicate_flag = true` field for later deduplication (out of scope for MVP — flagged for admin review).

**Given** a Receptionist uses the global header search bar and types a patient name,
**When** results appear in the search dropdown,
**Then** patients matching the query are shown in a "Patients" section of the dropdown results.
**And** clicking a patient result navigates to their profile.
**And** appointments matching the query (by patient name or token) are shown in an "Appointments" section below.
**And** the dropdown closes when the Receptionist clicks outside or presses Escape.

**Given** the search API is called with a query,
**When** processing the request,
**Then** the API validates that the `clinicId` in the query matches the authenticated session's `clinicId` — cross-clinic access is rejected with 403.
**And** the `search_path` middleware ensures queries only touch `clinic_{clinicId}.patients`.

**Given** the clinic has more than 20 patients,
**When** the Patients directory loads without a search query,
**Then** patients are paginated: 20 per page with "Previous / Next" pagination controls.
**And** the current page and total are shown: "Showing 1–20 of 47 patients".

## UX Design Reference

**EXPERIENCE.md — Patient search (UX-DR33):**
> Search input: full-width at top of Patients page, 48px height, magnifying glass icon left, clear (×) icon right when non-empty. Results render inline below (list replaces directory when query is active). Each result row: avatar initials (circle, brand-primary bg, 36px) + Name (16px semibold) + Phone masked + Last visit chip. Hover: row bg-neutral-50. Active/selected: row bg-primary/5.
>
> Global header search: command-K shortcut opens modal overlay search. Results in categorised sections (Patients / Appointments). Max 5 results per section; "See all" link to full directory with query pre-filled.

**DESIGN.md — Patient directory:**
- Directory table: no borders (borderless rows), `border-bottom: 1px --color-border` between rows
- Patient avatar: 36px circle, initials (first + last name initial), `bg-primary/10 text-primary`
- Name: 15px Inter semibold neutral-900
- Phone masked: 13px Inter neutral-500
- Last visit chip: 12px, `bg-neutral-100 text-neutral-600 rounded-full px-2 py-0.5`
- Search highlight: matched text wrapped in `<mark>` styled with `bg-yellow-100 text-yellow-800`

## File Locations

```
apps/web/
  src/
    app/
      (portal)/
        patients/
          page.tsx                        ← Patients directory page (Server Component: initial list)
          PatientDirectoryClient.tsx      ← Client: search input + results + pagination
      api/
        v1/
          patients/
            search/
              route.ts                    ← GET: patient search (name ILIKE + phone match)
            route.ts                      ← POST: create patient (with de-dup check)
    components/
      patients/
        PatientDirectoryTable.tsx         ← Paginated patient list
        PatientSearchBar.tsx              ← Search input with debounce
        PatientSearchResults.tsx          ← Search result rows with highlight
        DuplicatePatientPrompt.tsx        ← De-duplication confirmation dialog
      search/
        GlobalSearch.tsx                  ← Header command-K search modal
        GlobalSearchResults.tsx           ← Categorised results (patients + appointments)
    hooks/
      usePatientSearch.ts                 ← React Query: debounced search hook
```

## Test Coverage Requirements

| Test type | What to cover | Target |
|---|---|---|
| Unit (Vitest) | Search: name ILIKE match (case-insensitive, 3+ chars) | 100% |
| Unit | Search: last-4-digit phone match | 100% |
| Unit | Search: full 10-digit phone exact match | 100% |
| Unit | Tenant isolation: clinicId mismatch → 403 | 100% |
| Integration | GET /api/v1/patients/search: responds in < 1s for 5,000-patient clinic | Performance assertion |
| Integration | POST /api/v1/patients: duplicate phone → returns existing record (not creates new) | 100% |
| Playwright (E2E) | Search by name: type 3+ chars → results render with highlight | Core path |
| Playwright | Search by phone (last 4): correct patient surfaces | Core path |
| Playwright | De-duplication prompt: enter existing phone on Add Patient → prompt shown | Core path |
| Playwright | Global search (Cmd+K): type name → patient result → click → navigates to profile | Core path |
