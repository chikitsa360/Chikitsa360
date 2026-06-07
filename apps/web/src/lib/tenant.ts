import { db } from './db'
import { readFileSync } from 'fs'
import { join } from 'path'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validate clinicId is a UUID to prevent SQL injection in search_path.
 */
function assertUuid(clinicId: string): void {
  if (!UUID_RE.test(clinicId)) {
    throw new Error(`Invalid clinicId format: ${clinicId}`)
  }
}

/**
 * Set PostgreSQL session context for tenant isolation.
 * Call this at the start of every authenticated request handler.
 */
export async function setTenantContext(clinicId: string): Promise<void> {
  assertUuid(clinicId)
  await db.$executeRawUnsafe(`SET LOCAL search_path TO "clinic_${clinicId}", public`)
  await db.$executeRawUnsafe(`SET LOCAL app.clinic_id = '${clinicId}'`)
}

/**
 * Provision a new clinic schema when a clinic signs up.
 * Creates clinic_{clinicId} schema and baseline tables.
 */
export async function provisionClinicSchema(clinicId: string): Promise<void> {
  assertUuid(clinicId)

  const schemaName = `clinic_${clinicId}`

  // Create schema
  await db.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)

  // Set search_path to new schema
  await db.$executeRawUnsafe(`SET LOCAL search_path TO "${schemaName}", public`)

  // Read and execute baseline SQL
  const baselinePath = join(process.cwd(), 'prisma', 'baseline', 'tenant-schema.sql')
  const sql = readFileSync(baselinePath, 'utf-8')

  // Execute each statement
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))

  for (const stmt of statements) {
    await db.$executeRawUnsafe(stmt)
  }
}
