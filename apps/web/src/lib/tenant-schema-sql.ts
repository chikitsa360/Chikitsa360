/**
 * Tenant schema SQL — inlined so it is always bundled by Next.js/Vercel.
 * Source of truth: prisma/baseline/tenant-schema.sql
 * Keep this in sync with that file when making schema changes.
 */
export const TENANT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS appointments (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    slot_id UUID,
    status TEXT NOT NULL DEFAULT 'scheduled',
    token_number INTEGER,
    booking_source TEXT NOT NULL DEFAULT 'portal',
    appointment_date DATE,
    appointment_time TIME,
    is_sample BOOLEAN NOT NULL DEFAULT false,
    whatsapp_delivery_status TEXT,
    delivery_failures JSONB,
    cancelled_at TIMESTAMP(3),
    cancelled_by UUID,
    cancelled_via TEXT,
    updated_by UUID,
    reminder_24h_sent_at TIMESTAMP(3),
    reminder_2h_sent_at TIMESTAMP(3),
    consultation_fee INTEGER,
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    paid_at TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT appointments_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS appointments_doctor_date_time_key
    ON appointments(doctor_id, appointment_date, appointment_time)
    WHERE appointment_time IS NOT NULL AND status != 'cancelled';

CREATE TABLE IF NOT EXISTS patients (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    name TEXT NOT NULL,
    dob DATE,
    gender TEXT,
    age_range TEXT,
    first_visit_reason TEXT,
    booking_source TEXT NOT NULL DEFAULT 'portal',
    whatsapp_opt_out_at TIMESTAMP(3),
    is_placeholder BOOLEAN NOT NULL DEFAULT false,
    duplicate_flag BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT patients_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS patients_phone_key ON patients(phone);

CREATE TABLE IF NOT EXISTS doctors (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    speciality TEXT,
    default_fee NUMERIC(10, 2),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT doctors_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS slots (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    date DATE NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT slots_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS slot_blocks (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    doctor_id UUID,
    block_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT,
    recurrence TEXT NOT NULL DEFAULT 'none',
    created_by UUID,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT slot_blocks_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    actor_id UUID NOT NULL,
    actor_role TEXT NOT NULL,
    resource_type TEXT NOT NULL DEFAULT 'appointment',
    resource_id UUID,
    metadata JSONB,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS visit_notes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT visit_notes_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS billing_records (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL,
    fee_amount NUMERIC(10, 2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT billing_records_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]',
    opt_out_at TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT whatsapp_conversations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS working_hours (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL,
    day_of_week INTEGER NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    slot_duration INTEGER NOT NULL DEFAULT 20,
    lunch_start_time TIME,
    lunch_end_time TIME,
    CONSTRAINT working_hours_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL,
    reminder_24h_enabled BOOLEAN NOT NULL DEFAULT true,
    reminder_2h_enabled BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT notification_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS event_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id TEXT NOT NULL,
    recurrence_type TEXT NOT NULL CHECK (recurrence_type IN ('daily','weekly')),
    recurrence_day_of_week INTEGER CHECK (recurrence_day_of_week >= 0 AND recurrence_day_of_week <= 6),
    total_occurrences INTEGER NOT NULL CHECK (total_occurrences >= 2 AND total_occurrences <= 52),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinic_id TEXT NOT NULL,
    series_id UUID REFERENCES event_series(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    venue TEXT,
    meeting_link TEXT,
    max_seats INTEGER NOT NULL CHECK (max_seats > 0 AND max_seats <= 500),
    seats_registered INTEGER NOT NULL DEFAULT 0 CHECK (seats_registered >= 0),
    registration_deadline TIMESTAMPTZ,
    fee_paise INTEGER CHECK (fee_paise >= 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','cancelled','completed')),
    slug TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL,
    reference_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','attended','no_show','cancelled')),
    cancellation_token TEXT UNIQUE,
    token_expires_at TIMESTAMPTZ,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_waiting_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL,
    position INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','promoted','removed')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL,
    sent_at TIMESTAMPTZ,
    delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent','failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, patient_id)
);

CREATE INDEX IF NOT EXISTS events_clinic_status_idx ON events(clinic_id, status);
CREATE INDEX IF NOT EXISTS events_slug_idx ON events(slug);
CREATE INDEX IF NOT EXISTS events_series_id_idx ON events(series_id) WHERE series_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS event_registrations_event_id_idx ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS event_registrations_event_patient_idx ON event_registrations(event_id, patient_id);
CREATE INDEX IF NOT EXISTS event_registrations_token_idx ON event_registrations(cancellation_token) WHERE cancellation_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS event_waiting_list_event_position_idx ON event_waiting_list(event_id, position);
CREATE INDEX IF NOT EXISTS event_invitations_event_id_idx ON event_invitations(event_id);
`
