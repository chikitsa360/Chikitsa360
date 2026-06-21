import { db } from './db'
import { TENANT_SCHEMA_SQL } from './tenant-schema-sql'

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
 * SQL is inlined from tenant-schema-sql.ts (not read from disk at runtime).
 */
export async function provisionClinicSchema(clinicId: string): Promise<void> {
  assertUuid(clinicId)

  const schemaName = `clinic_${clinicId}`

  // Execute everything in a single transaction so SET LOCAL search_path
  // persists across statements (required when using PgBouncer pooled connections)
  await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schemaName}", public`)

    const statements = TENANT_SCHEMA_SQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'))

    for (const stmt of statements) {
      await tx.$executeRawUnsafe(stmt)
    }
  })
}
