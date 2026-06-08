import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

/**
 * GET /api/v1/activity-log?page=1&pageSize=20&action=reschedule&startDate=&endDate=
 * Authenticated (Owner only). Returns the tenant-level appointment audit log.
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.clinicId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const clinicId = session.user.clinicId
  const schemaName = `clinic_${clinicId}`

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(50, Math.max(5, parseInt(req.nextUrl.searchParams.get('pageSize') ?? '20', 10)))
  const actionFilter = req.nextUrl.searchParams.get('action')
  const startDate = req.nextUrl.searchParams.get('startDate')
  const endDate = req.nextUrl.searchParams.get('endDate')

  const offset = (page - 1) * pageSize
  const args: unknown[] = []
  const conditions: string[] = []

  if (actionFilter) {
    args.push(actionFilter)
    conditions.push(`action = $${args.length}`)
  }
  if (startDate) {
    args.push(startDate)
    conditions.push(`created_at >= $${args.length}::date`)
  }
  if (endDate) {
    args.push(endDate)
    conditions.push(`created_at < ($${args.length}::date + INTERVAL '1 day')`)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = await db.$queryRawUnsafe<{
    id: string
    action: string
    actor_id: string
    actor_role: string
    resource_type: string
    resource_id: string | null
    metadata: unknown
    created_at: string
  }[]>(
    `SELECT id, action, actor_id, actor_role, resource_type, resource_id, metadata, created_at::text
     FROM "${schemaName}".audit_log
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
    ...args
  )

  // Get total count
  const countRows = await db.$queryRawUnsafe<{ count: string }[]>(
    `SELECT COUNT(*)::text AS count FROM "${schemaName}".audit_log ${whereClause}`,
    ...args
  )
  const total = parseInt(countRows[0]?.count ?? '0', 10)

  return NextResponse.json({
    entries: rows,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  })
}
