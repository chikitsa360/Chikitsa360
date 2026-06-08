-- CreateTable export_jobs (Story 10.3: async CSV export)
CREATE TABLE "export_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "requested_by" UUID NOT NULL,
    "report_type" TEXT NOT NULL,
    "from_date" TEXT NOT NULL,
    "to_date" TEXT NOT NULL,
    "doctor_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "csv_data" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "export_jobs_clinic_id_status_idx" ON "export_jobs"("clinic_id", "status");
