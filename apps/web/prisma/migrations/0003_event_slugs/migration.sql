-- Global event slug → clinic lookup table (Story 13.4)
-- Allows public /events/[slug] pages to resolve which clinic owns an event
-- without scanning all tenant schemas.
CREATE TABLE IF NOT EXISTS "event_slugs" (
    "slug" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    CONSTRAINT "event_slugs_pkey" PRIMARY KEY ("slug")
);
