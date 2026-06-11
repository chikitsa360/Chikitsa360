import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { inngest } from '@/lib/inngest'
import { writeAuditLog } from '@/lib/audit'
import { UserRole } from '@prisma/client'

/**
 * POST /api/v1/clinics/[clinicId]/export
 * Owner-only. Enqueues a clinic data export job (CR-13, Story 11.3).
 * Generates patients + appointments + slot_blocks as a ZIP.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clinicId: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if ((session.user.role as UserRole) !== 'OWNER') {
    return NextResponse.json({ error: 'Only clinic owners can export clinic data.' }, { status: 403 })
  }

  const { clinicId: paramClinicId } = await params
  if (paramClinicId !== session.user.clinicId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const clinicId = session.user.clinicId

  // Create an export job record
  const job = await db.exportJob.create({
    data: {
      clinicId,
      requestedBy: session.user.id,
      reportType: 'clinic-export',
      fromDate: '',
      toDate: '',
      status: 'pending',
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
    },
  })

  // Enqueue Inngest job
  await inngest.send({
    name: 'clinic/data-export.generate',
    data: { jobId: job.id, clinicId, requestedBy: session.user.id },
  })

  await writeAuditLog({
    clinicId,
    userId: session.user.id,
    action: 'EXPORT_DATA',
    resourceType: 'clinic',
    resourceId: clinicId,
    metadata: { jobId: job.id },
  })

  return NextResponse.json({ jobId: job.id, status: 'pending' }, { status: 202 })
}

/**
 * GET /api/v1/clinics/[clinicId]/export/download?jobId=
 * Owner-only. Streams the completed ZIP from the export job.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clinicId: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { clinicId: paramClinicId } = await params
  if (paramClinicId !== session.user.clinicId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) {
    return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
  }

  const job = await db.exportJob.findFirst({
    where: { id: jobId, clinicId: session.user.clinicId, reportType: 'clinic-export' },
  })

  if (!job) {
    return NextResponse.json({ error: 'Export not found' }, { status: 404 })
  }

  if (job.status === 'pending') {
    return NextResponse.json({ status: 'pending' }, { status: 202 })
  }

  if (job.status === 'failed') {
    return NextResponse.json({ error: 'Export failed. Please try again.' }, { status: 500 })
  }

  if (new Date() > job.expiresAt) {
    return NextResponse.json(
      { error: 'This download link has expired. Please request a new export from Settings → Data Rights.' },
      { status: 410 }
    )
  }

  if (!job.csvData) {
    return NextResponse.json({ error: 'Export data not available' }, { status: 500 })
  }

  // csvData stores the base64-encoded ZIP
  const zipBuffer = Buffer.from(job.csvData, 'base64')
  const clinic = await db.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: { slug: true },
  })
  const today = new Date().toISOString().slice(0, 10)
  const filename = `${clinic?.slug ?? 'clinic'}-data-export-${today}.zip`

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
