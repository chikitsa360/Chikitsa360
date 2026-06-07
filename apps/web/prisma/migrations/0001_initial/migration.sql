-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'DOCTOR', 'RECEPTIONIST');
CREATE TYPE "ClinicPlan" AS ENUM ('STARTER', 'GROWTH', 'PRO');
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED');

-- CreateTable: clinics
CREATE TABLE "clinics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "ClinicPlan" NOT NULL DEFAULT 'STARTER',
    "trial_ends_at" TIMESTAMP(3),
    "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "clinics_slug_key" ON "clinics"("slug");

-- CreateTable: users
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL,
    "clinic_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateTable: sessions
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "device_fingerprint" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: otp_attempts
CREATE TABLE "otp_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "otp_attempts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "otp_attempts_phone_key" ON "otp_attempts"("phone");

-- CreateTable: staff_invites
CREATE TABLE "staff_invites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_invites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "staff_invites_token_key" ON "staff_invites"("token");

-- Foreign keys
ALTER TABLE "users" ADD CONSTRAINT "users_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create audit schema with INSERT-only application role
CREATE SCHEMA IF NOT EXISTS audit;

CREATE TABLE audit."audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID,
    "user_id" UUID,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Application role: INSERT only on audit_logs (compliance CR-12)
-- REVOKE UPDATE, DELETE, TRUNCATE ON audit."audit_logs" FROM PUBLIC;
-- Run these as superuser in production:
-- GRANT INSERT ON audit."audit_logs" TO app_role;
-- REVOKE UPDATE, DELETE, TRUNCATE ON audit."audit_logs" FROM app_role;
