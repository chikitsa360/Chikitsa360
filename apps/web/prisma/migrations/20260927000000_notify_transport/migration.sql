-- CreateEnum
CREATE TYPE "WhatsAppTransport" AS ENUM ('direct', 'notify');

-- AlterTable — all additive with defaults; existing clinics stay on 'direct'
-- (the legacy Meta Cloud API path) with unchanged behavior.
ALTER TABLE "clinics" ADD COLUMN "whatsapp_transport" "WhatsAppTransport" NOT NULL DEFAULT 'direct';
ALTER TABLE "clinics" ADD COLUMN "notify_tenant_id" TEXT;
ALTER TABLE "clinics" ADD COLUMN "notify_api_key_encrypted" TEXT;
ALTER TABLE "clinics" ADD COLUMN "notify_webhook_secret_encrypted" TEXT;
