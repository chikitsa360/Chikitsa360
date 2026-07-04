-- Backfill events-related tables in all existing clinic tenant schemas.
-- These tables were added to tenant-schema.sql in Epic 12, but clinics
-- created before that epic are missing them.

DO $$
DECLARE
  schema_rec RECORD;
BEGIN
  FOR schema_rec IN
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name LIKE 'clinic_%'
  LOOP
    -- event_series (must exist before events due to FK)
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.event_series (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clinic_id TEXT NOT NULL,
        recurrence_type TEXT NOT NULL CHECK (recurrence_type IN (''daily'',''weekly'')),
        recurrence_day_of_week INTEGER CHECK (recurrence_day_of_week >= 0 AND recurrence_day_of_week <= 6),
        total_occurrences INTEGER NOT NULL CHECK (total_occurrences >= 2 AND total_occurrences <= 52),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )', schema_rec.schema_name);

    -- events
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clinic_id TEXT NOT NULL,
        series_id UUID REFERENCES %I.event_series(id) ON DELETE SET NULL,
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
        status TEXT NOT NULL DEFAULT ''draft'' CHECK (status IN (''draft'',''published'',''cancelled'',''completed'')),
        slug TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (slug)
      )', schema_rec.schema_name, schema_rec.schema_name);

    -- event_registrations
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.event_registrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES %I.events(id) ON DELETE CASCADE,
        patient_id UUID NOT NULL,
        reference_number TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT ''registered'' CHECK (status IN (''registered'',''attended'',''no_show'',''cancelled'')),
        cancellation_token TEXT UNIQUE,
        token_expires_at TIMESTAMPTZ,
        registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )', schema_rec.schema_name, schema_rec.schema_name);

    -- event_waiting_list
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.event_waiting_list (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES %I.events(id) ON DELETE CASCADE,
        patient_id UUID NOT NULL,
        position INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT ''waiting'' CHECK (status IN (''waiting'',''promoted'',''removed'')),
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )', schema_rec.schema_name, schema_rec.schema_name);

    -- event_invitations
    EXECUTE format('
      CREATE TABLE IF NOT EXISTS %I.event_invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES %I.events(id) ON DELETE CASCADE,
        patient_id UUID NOT NULL,
        sent_at TIMESTAMPTZ,
        delivery_status TEXT NOT NULL DEFAULT ''pending'' CHECK (delivery_status IN (''pending'',''sent'',''failed'')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (event_id, patient_id)
      )', schema_rec.schema_name, schema_rec.schema_name);

    -- Indexes
    EXECUTE format('CREATE INDEX IF NOT EXISTS events_clinic_status_idx ON %I.events(clinic_id, status)', schema_rec.schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS events_slug_idx ON %I.events(slug)', schema_rec.schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS events_series_id_idx ON %I.events(series_id) WHERE series_id IS NOT NULL', schema_rec.schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS event_registrations_event_id_idx ON %I.event_registrations(event_id)', schema_rec.schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS event_registrations_event_patient_idx ON %I.event_registrations(event_id, patient_id)', schema_rec.schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS event_registrations_token_idx ON %I.event_registrations(cancellation_token) WHERE cancellation_token IS NOT NULL', schema_rec.schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS event_waiting_list_event_position_idx ON %I.event_waiting_list(event_id, position)', schema_rec.schema_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS event_invitations_event_id_idx ON %I.event_invitations(event_id)', schema_rec.schema_name);

    RAISE NOTICE 'Backfilled events tables in schema: %', schema_rec.schema_name;
  END LOOP;
END
$$;
