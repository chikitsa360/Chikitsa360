-- Epic 11: Subscription plan enforcement & compliance fields

-- Add plan expiry and doctor limit to clinics
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "plan_expires_at" TIMESTAMPTZ;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "doctor_limit" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "last_export_url" TEXT;
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "last_export_expires_at" TIMESTAMPTZ;

-- Set default trial expiry for existing clinics (14 days from now for safety)
UPDATE "clinics" SET "plan_expires_at" = NOW() + INTERVAL '14 days' WHERE "plan_expires_at" IS NULL;

-- Add system_role to users (for super admin)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "system_role" TEXT;
