/*
  Warnings:

  - The primary key for the `clinics` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `export_jobs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `otp_attempts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `staff_invites` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `event_slugs` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ClinicLanguage" AS ENUM ('en', 'hi');

-- DropForeignKey
ALTER TABLE "staff_invites" DROP CONSTRAINT "staff_invites_clinic_id_fkey";

-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_clinic_id_fkey";

-- DropIndex
DROP INDEX "export_jobs_clinic_id_status_idx";

-- AlterTable
ALTER TABLE "clinics" DROP CONSTRAINT "clinics_pkey",
ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "clinic_phone" TEXT,
ADD COLUMN     "dpa_accepted_at" TIMESTAMP(3),
ADD COLUMN     "event_reminder_24h_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "language" "ClinicLanguage" NOT NULL DEFAULT 'en',
ADD COLUMN     "onboarding_step" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "privacy_accepted_at" TIMESTAMP(3),
ADD COLUMN     "reminder_24h_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reminder_2h_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "speciality" TEXT,
ADD COLUMN     "tos_accepted_at" TIMESTAMP(3),
ADD COLUMN     "whatsapp_connected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsapp_phone_number_id" TEXT,
ADD COLUMN     "whatsapp_waba_id" TEXT,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "plan_expires_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "last_export_expires_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "clinics_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "export_jobs" DROP CONSTRAINT "export_jobs_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "clinic_id" SET DATA TYPE TEXT,
ALTER COLUMN "requested_by" SET DATA TYPE TEXT,
ALTER COLUMN "doctor_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "otp_attempts" DROP CONSTRAINT "otp_attempts_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "otp_attempts_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "user_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "staff_invites" DROP CONSTRAINT "staff_invites_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "clinic_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "staff_invites_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" DROP CONSTRAINT "users_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "clinic_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "event_slugs";

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invites" ADD CONSTRAINT "staff_invites_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
