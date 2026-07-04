-- Recreate event_slugs table dropped by 20260621180332_prod migration
CREATE TABLE IF NOT EXISTS "event_slugs" (
    "slug" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    CONSTRAINT "event_slugs_pkey" PRIMARY KEY ("slug")
);
