-- Tenant schema baseline — run on CREATE for each clinic_{clinicId} schema
-- Called from: apps/web/src/lib/tenant.ts provisionClinicSchema()

-- appointments
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
    updated_by UUID,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT appointments_pkey PRIMARY KEY (id)
);
-- Prevent double-booking: unique slot per doctor per date+time (for web/whatsapp bookings)
CREATE UNIQUE INDEX IF NOT EXISTS appointments_doctor_date_time_key
    ON appointments(doctor_id, appointment_date, appointment_time)
    WHERE appointment_time IS NOT NULL AND status != 'cancelled';

-- patients
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
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT patients_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS patients_phone_key ON patients(phone);

-- doctors
CREATE TABLE IF NOT EXISTS doctors (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    speciality TEXT,
    default_fee NUMERIC(10, 2),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT doctors_pkey PRIMARY KEY (id)
);

-- slots
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

-- slot_blocks
CREATE TABLE IF NOT EXISTS slot_blocks (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    doctor_id UUID,             -- NULL = all doctors
    block_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT,
    recurrence TEXT NOT NULL DEFAULT 'none',  -- 'none' | 'daily' | 'weekly'
    created_by UUID,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT slot_blocks_pkey PRIMARY KEY (id)
);

-- audit_log (per-tenant immutable event log for appointment activity)
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

-- visit_notes
CREATE TABLE IF NOT EXISTS visit_notes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    note TEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT visit_notes_pkey PRIMARY KEY (id)
);

-- billing_records
CREATE TABLE IF NOT EXISTS billing_records (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL,
    fee_amount NUMERIC(10, 2) NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT billing_records_pkey PRIMARY KEY (id)
);

-- whatsapp_conversations
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]',
    opt_out_at TIMESTAMP(3),
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT whatsapp_conversations_pkey PRIMARY KEY (id)
);

-- working_hours
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

-- notification_settings
CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    clinic_id UUID NOT NULL,
    reminder_24h_enabled BOOLEAN NOT NULL DEFAULT true,
    reminder_2h_enabled BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT notification_settings_pkey PRIMARY KEY (id)
);
