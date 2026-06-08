import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/v1/reports/export/[jobId]
 * Owner-only. Returns the status of an async export job.
 * If complete, returns the CSV as a download.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { jobId } = await params

  const job = await db.exportJob.findUnique({ where: { id: jobId } })

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  if (job.clinicId !== session.user.clinicId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (job.status === 'pending') {
    return NextResponse.json({ status: 'pending' })
  }

  if (job.status === 'failed') {
    return NextResponse.json({ status: 'failed', error: job.errorMessage })
  }

  // Complete — return CSV
  if (job.status === 'complete' && job.csvData) {
    // Check expiry
    if (new Date() > job.expiresAt) {
      return NextResponse.json({ status: 'expired' }, { status: 410 })
    }

    const filename = `${job.reportType}-${job.clinicId}-${job.fromDate}-${job.toDate}.csv`
    return new Response(job.csvData, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  return NextResponse.json({ status: job.status })
}
