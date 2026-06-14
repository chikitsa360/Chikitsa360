/**
 * Dev seed script — populates the database with realistic data for local testing.
 *
 * Run: pnpm --filter @chikitsa360/web db:seed
 *
 * Credentials after seeding:
 *   Phone       Role          Name
 *   9999999999  OWNER         Dr. Priya Sharma
 *   9888888888  DOCTOR        Dr. Arjun Mehta
 *   9777777777  DOCTOR        Dr. Kavitha Rao
 *   9666666666  RECEPTIONIST  Sneha Patel
 *
 * OTP (dev mode, no Redis needed): 123456
 */

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const prisma = new PrismaClient()

// ── Helpers ────────────────────────────────────────────────────────────────

function uid() {
  return crypto.randomUUID()
}

/** Returns YYYY-MM-DD string offset from today (IST-aware enough for dev). */
function dateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Provisions the tenant schema tables inside a transaction so SET LOCAL works. */
async function provisionSchema(clinicId: string) {
  const schemaName = `clinic_${clinicId}`
  await prisma.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`)

  const baselineSql = readFileSync(
    join(process.cwd(), 'prisma', 'baseline', 'tenant-schema.sql'),
    'utf-8'
  )
  const statements = baselineSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => {
      // Strip comment lines and check if any real SQL remains
      const withoutComments = s.replace(/--[^\n]*/g, '').trim()
      return withoutComments.length > 0
    })

  // SET LOCAL search_path requires a transaction to persist across statements
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schemaName}", public`)
    for (const stmt of statements) {
      await tx.$executeRawUnsafe(stmt)
    }
  })
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seeding dev database...\n')

  // ── 1. Clean up previous seed ──────────────────────────────────────────

  const seedPhones = ['9999999999', '9888888888', '9777777777', '9666666666']

  // Find existing seed users to get their clinic IDs
  const existingUsers = await prisma.user.findMany({ where: { phone: { in: seedPhones } } })
  const existingClinicIds = [...new Set(existingUsers.map((u) => u.clinicId).filter(Boolean))]

  // Drop tenant schemas
  for (const id of existingClinicIds) {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "clinic_${id}" CASCADE`)
  }

  // Delete public schema records (FK order: users first, then clinics)
  await prisma.user.deleteMany({ where: { phone: { in: seedPhones } } })
  await prisma.clinic.deleteMany({ where: { slug: 'city-care' } })

  console.log('✓ Cleaned previous seed data')

  // ── 2. Public schema: clinic + users ──────────────────────────────────

  const clinic = await prisma.clinic.create({
    data: {
      name: 'City Care Clinic',
      slug: 'city-care',
      address: '12, MG Road, Indiranagar',
      city: 'Bengaluru',
      speciality: 'General Medicine',
      clinicPhone: '08011112222',
      plan: 'STARTER',
      onboardingComplete: true,
      onboardingStep: 5,
      tosAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      dpaAcceptedAt: new Date(),
      planExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      doctorLimit: 5,
    },
  })

  const ownerUser = await prisma.user.create({
    data: { phone: '9999999999', name: 'Dr. Priya Sharma', role: 'OWNER', clinicId: clinic.id },
  })
  const doctor1User = await prisma.user.create({
    data: { phone: '9888888888', name: 'Dr. Arjun Mehta', role: 'DOCTOR', clinicId: clinic.id },
  })
  const doctor2User = await prisma.user.create({
    data: { phone: '9777777777', name: 'Dr. Kavitha Rao', role: 'DOCTOR', clinicId: clinic.id },
  })
  await prisma.user.create({
    data: { phone: '9666666666', name: 'Sneha Patel', role: 'RECEPTIONIST', clinicId: clinic.id },
  })

  console.log(`✓ Created clinic "${clinic.name}" (id: ${clinic.id})`)
  console.log(`✓ Created 4 users (owner, 2 doctors, 1 receptionist)`)

  // ── 3. Provision tenant schema ─────────────────────────────────────────

  await provisionSchema(clinic.id)
  console.log(`✓ Provisioned tenant schema "clinic_${clinic.id}"`)

  const q = (table: string) => `"clinic_${clinic.id}"."${table}"`

  // ── 4. Doctors ─────────────────────────────────────────────────────────

  const doctorId1 = uid()
  const doctorId2 = uid()

  await prisma.$executeRawUnsafe(`
    INSERT INTO ${q('doctors')} (id, user_id, name, speciality, default_fee) VALUES
      ('${doctorId1}', '${doctor1User.id}', 'Dr. Arjun Mehta', 'General Medicine', 500),
      ('${doctorId2}', '${doctor2User.id}', 'Dr. Kavitha Rao',  'Paediatrics',       600)
  `)

  // ── 5. Working hours (Mon–Sat, 9 AM – 5 PM, 20-min slots) ─────────────

  for (const doctorId of [doctorId1, doctorId2]) {
    for (let day = 1; day <= 6; day++) {
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${q('working_hours')}
          (id, doctor_id, day_of_week, start_time, end_time, is_active, slot_duration, lunch_start_time, lunch_end_time)
        VALUES
          (gen_random_uuid(), '${doctorId}', ${day}, '09:00', '17:00', true, 20, '13:00', '14:00')
      `)
    }
  }

  console.log(`✓ Seeded doctors and working hours`)

  // ── 6. Patients ────────────────────────────────────────────────────────

  const patients: Array<{ id: string; phone: string; name: string; gender: string }> = [
    { id: uid(), phone: '9111111111', name: 'Rahul Sharma',    gender: 'male'   },
    { id: uid(), phone: '9222222222', name: 'Meena Iyer',      gender: 'female' },
    { id: uid(), phone: '9333333333', name: 'Arjun Patil',     gender: 'male'   },
    { id: uid(), phone: '9444444444', name: 'Sonal Desai',     gender: 'female' },
    { id: uid(), phone: '9555555555', name: 'Vikram Nair',     gender: 'male'   },
    { id: uid(), phone: '9123456789', name: 'Priya Patel',     gender: 'female' },
    { id: uid(), phone: '9876543210', name: 'Suresh Kumar',    gender: 'male'   },
    { id: uid(), phone: '9654321098', name: 'Anita Gupta',     gender: 'female' },
    { id: uid(), phone: '9345678901', name: 'Rajesh Verma',    gender: 'male'   },
    { id: uid(), phone: '9456789012', name: 'Geeta Singh',     gender: 'female' },
    { id: uid(), phone: '9234567890', name: 'Mohan Rao',       gender: 'male'   },
    { id: uid(), phone: '9789012345', name: 'Sunita Joshi',    gender: 'female' },
    { id: uid(), phone: '9890123456', name: 'Arun Sharma',     gender: 'male'   },
    { id: uid(), phone: '9012345678', name: 'Kavya Reddy',     gender: 'female' },
    { id: uid(), phone: '9901234567', name: 'Deepak Malhotra', gender: 'male'   },
    { id: uid(), phone: '9678901234', name: 'Pooja Nair',      gender: 'female' },
    { id: uid(), phone: '9567890123', name: 'Rohit Khanna',    gender: 'male'   },
    { id: uid(), phone: '9345678902', name: 'Neha Gupta',      gender: 'female' },
    { id: uid(), phone: '9456789013', name: 'Ashish Patel',    gender: 'male'   },
    { id: uid(), phone: '9234567891', name: 'Rekha Iyer',      gender: 'female' },
  ]

  for (const p of patients) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO ${q('patients')} (id, phone, name, gender, booking_source)
      VALUES ('${p.id}', '${p.phone}', '${p.name}', '${p.gender}', 'portal')
    `)
  }

  console.log(`✓ Seeded ${patients.length} patients`)

  // ── 7. Appointments ────────────────────────────────────────────────────

  let appointmentCount = 0

  // Today: 8 appointments for Dr. Arjun with various statuses
  const todayAppts: Array<{ time: string; patientIdx: number; status: string; fee: number | null; payStatus: string }> = [
    { time: '09:00', patientIdx: 0,  status: 'completed',  fee: 500, payStatus: 'paid'   },
    { time: '09:20', patientIdx: 1,  status: 'completed',  fee: 500, payStatus: 'paid'   },
    { time: '09:40', patientIdx: 2,  status: 'completed',  fee: 500, payStatus: 'unpaid' },
    { time: '10:00', patientIdx: 3,  status: 'confirmed',  fee: null, payStatus: 'unpaid' },
    { time: '10:20', patientIdx: 4,  status: 'confirmed',  fee: null, payStatus: 'unpaid' },
    { time: '10:40', patientIdx: 5,  status: 'scheduled',  fee: null, payStatus: 'unpaid' },
    { time: '11:00', patientIdx: 6,  status: 'scheduled',  fee: null, payStatus: 'unpaid' },
    { time: '14:00', patientIdx: 7,  status: 'no-show',    fee: null, payStatus: 'unpaid' },
  ]

  for (const a of todayAppts) {
    const feeVal = a.fee !== null ? a.fee : 'NULL'
    const paidAt = a.payStatus === 'paid' ? `NOW() - INTERVAL '1 hour'` : 'NULL'
    await prisma.$executeRawUnsafe(`
      INSERT INTO ${q('appointments')}
        (id, patient_id, doctor_id, status, booking_source, appointment_date, appointment_time,
         consultation_fee, payment_status, paid_at, token_number)
      VALUES
        (gen_random_uuid(), '${patients[a.patientIdx]!.id}', '${doctorId1}',
         '${a.status}', 'portal', '${dateOffset(0)}', '${a.time}',
         ${feeVal}, '${a.payStatus}', ${paidAt}, ${appointmentCount + 1})
    `)
    appointmentCount++
  }

  // Today: 4 appointments for Dr. Kavitha
  const todayKavitha = [
    { time: '09:00', patientIdx: 8,  status: 'completed',  fee: 600 },
    { time: '09:20', patientIdx: 9,  status: 'completed',  fee: 600 },
    { time: '10:00', patientIdx: 10, status: 'confirmed',  fee: null },
    { time: '11:00', patientIdx: 11, status: 'scheduled',  fee: null },
  ]

  for (const a of todayKavitha) {
    const feeVal = a.fee !== null ? a.fee : 'NULL'
    const payStatus = a.fee !== null ? 'paid' : 'unpaid'
    const paidAt = a.fee !== null ? `NOW() - INTERVAL '2 hours'` : 'NULL'
    await prisma.$executeRawUnsafe(`
      INSERT INTO ${q('appointments')}
        (id, patient_id, doctor_id, status, booking_source, appointment_date, appointment_time,
         consultation_fee, payment_status, paid_at, token_number)
      VALUES
        (gen_random_uuid(), '${patients[a.patientIdx]!.id}', '${doctorId2}',
         '${a.status}', 'portal', '${dateOffset(0)}', '${a.time}',
         ${feeVal}, '${payStatus}', ${paidAt}, ${appointmentCount + 1})
    `)
    appointmentCount++
  }

  // Past 30 days: spread appointments across last month
  const pastData = [
    { dayOffset: -1,  patientIdx: 12, doctorId: doctorId1, time: '09:00', status: 'completed', fee: 500 },
    { dayOffset: -1,  patientIdx: 13, doctorId: doctorId1, time: '09:40', status: 'completed', fee: 500 },
    { dayOffset: -1,  patientIdx: 14, doctorId: doctorId2, time: '10:00', status: 'no-show',   fee: null },
    { dayOffset: -2,  patientIdx: 15, doctorId: doctorId1, time: '11:00', status: 'completed', fee: 500 },
    { dayOffset: -2,  patientIdx: 16, doctorId: doctorId2, time: '09:20', status: 'completed', fee: 600 },
    { dayOffset: -3,  patientIdx: 17, doctorId: doctorId1, time: '10:20', status: 'completed', fee: 500 },
    { dayOffset: -3,  patientIdx: 18, doctorId: doctorId2, time: '14:00', status: 'completed', fee: 600 },
    { dayOffset: -3,  patientIdx: 19, doctorId: doctorId1, time: '15:00', status: 'no-show',   fee: null },
    { dayOffset: -5,  patientIdx: 0,  doctorId: doctorId1, time: '09:00', status: 'completed', fee: 500 },
    { dayOffset: -5,  patientIdx: 1,  doctorId: doctorId2, time: '11:00', status: 'completed', fee: 600 },
    { dayOffset: -7,  patientIdx: 2,  doctorId: doctorId1, time: '10:00', status: 'completed', fee: 500 },
    { dayOffset: -7,  patientIdx: 3,  doctorId: doctorId2, time: '09:40', status: 'completed', fee: 600 },
    { dayOffset: -9,  patientIdx: 4,  doctorId: doctorId1, time: '14:20', status: 'completed', fee: 500 },
    { dayOffset: -10, patientIdx: 5,  doctorId: doctorId2, time: '10:40', status: 'no-show',   fee: null },
    { dayOffset: -10, patientIdx: 6,  doctorId: doctorId1, time: '09:20', status: 'completed', fee: 500 },
    { dayOffset: -12, patientIdx: 7,  doctorId: doctorId2, time: '15:00', status: 'completed', fee: 600 },
    { dayOffset: -14, patientIdx: 8,  doctorId: doctorId1, time: '11:40', status: 'completed', fee: 500 },
    { dayOffset: -14, patientIdx: 9,  doctorId: doctorId2, time: '09:00', status: 'completed', fee: 600 },
    { dayOffset: -16, patientIdx: 10, doctorId: doctorId1, time: '10:00', status: 'cancelled', fee: null },
    { dayOffset: -18, patientIdx: 11, doctorId: doctorId2, time: '14:40', status: 'completed', fee: 600 },
    { dayOffset: -20, patientIdx: 12, doctorId: doctorId1, time: '09:40', status: 'completed', fee: 500 },
    { dayOffset: -21, patientIdx: 13, doctorId: doctorId2, time: '11:00', status: 'completed', fee: 600 },
    { dayOffset: -23, patientIdx: 14, doctorId: doctorId1, time: '10:20', status: 'completed', fee: 500 },
    { dayOffset: -25, patientIdx: 15, doctorId: doctorId2, time: '09:20', status: 'completed', fee: 600 },
    { dayOffset: -28, patientIdx: 16, doctorId: doctorId1, time: '16:00', status: 'completed', fee: 500 },
    { dayOffset: -28, patientIdx: 17, doctorId: doctorId2, time: '15:40', status: 'no-show',   fee: null },
    { dayOffset: -30, patientIdx: 18, doctorId: doctorId1, time: '09:00', status: 'completed', fee: 500 },
    { dayOffset: -30, patientIdx: 19, doctorId: doctorId2, time: '10:00', status: 'completed', fee: 600 },
  ]

  for (const a of pastData) {
    const feeVal = a.fee !== null ? a.fee : 'NULL'
    const payStatus = a.fee !== null ? 'paid' : 'unpaid'
    const paidAt = a.fee !== null ? `CURRENT_TIMESTAMP - INTERVAL '${Math.abs(a.dayOffset)} days'` : 'NULL'
    await prisma.$executeRawUnsafe(`
      INSERT INTO ${q('appointments')}
        (id, patient_id, doctor_id, status, booking_source, appointment_date, appointment_time,
         consultation_fee, payment_status, paid_at, token_number)
      VALUES
        (gen_random_uuid(), '${patients[a.patientIdx]!.id}', '${a.doctorId}',
         '${a.status}', 'portal', '${dateOffset(a.dayOffset)}', '${a.time}',
         ${feeVal}, '${payStatus}', ${paidAt}, ${appointmentCount + 1})
    `)
    appointmentCount++
  }

  // Future appointments (next 7 days)
  const futureData = [
    { dayOffset: 1, patientIdx: 0,  doctorId: doctorId1, time: '09:00', status: 'confirmed' },
    { dayOffset: 1, patientIdx: 1,  doctorId: doctorId1, time: '09:40', status: 'scheduled' },
    { dayOffset: 1, patientIdx: 2,  doctorId: doctorId2, time: '10:00', status: 'confirmed' },
    { dayOffset: 2, patientIdx: 3,  doctorId: doctorId1, time: '11:00', status: 'scheduled' },
    { dayOffset: 2, patientIdx: 4,  doctorId: doctorId2, time: '14:20', status: 'scheduled' },
    { dayOffset: 3, patientIdx: 5,  doctorId: doctorId1, time: '09:20', status: 'confirmed' },
    { dayOffset: 4, patientIdx: 6,  doctorId: doctorId2, time: '10:40', status: 'scheduled' },
    { dayOffset: 5, patientIdx: 7,  doctorId: doctorId1, time: '15:00', status: 'scheduled' },
    { dayOffset: 6, patientIdx: 8,  doctorId: doctorId2, time: '09:00', status: 'scheduled' },
    { dayOffset: 7, patientIdx: 9,  doctorId: doctorId1, time: '11:20', status: 'scheduled' },
  ]

  for (const a of futureData) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO ${q('appointments')}
        (id, patient_id, doctor_id, status, booking_source, appointment_date, appointment_time,
         token_number)
      VALUES
        (gen_random_uuid(), '${patients[a.patientIdx]!.id}', '${a.doctorId}',
         '${a.status}', 'portal', '${dateOffset(a.dayOffset)}', '${a.time}',
         ${appointmentCount + 1})
    `)
    appointmentCount++
  }

  console.log(`✓ Seeded ${appointmentCount} appointments (today: 12, past: 28, future: 10)`)

  // ── 8. A sample published event ────────────────────────────────────────

  const eventId = uid()
  const eventSlug = 'diabetes-awareness-2026'
  const eventStart = new Date()
  eventStart.setDate(eventStart.getDate() + 10)
  eventStart.setHours(10, 0, 0, 0)
  const eventEnd = new Date(eventStart)
  eventEnd.setHours(13, 0, 0, 0)

  await prisma.$executeRawUnsafe(`
    INSERT INTO ${q('events')}
      (id, clinic_id, title, description, start_time, end_time, venue, max_seats,
       seats_registered, status, slug, created_by)
    VALUES
      ('${eventId}', '${clinic.id}',
       'Diabetes Awareness Workshop',
       'Free health check-up and awareness session on managing diabetes and lifestyle diseases.',
       '${eventStart.toISOString()}', '${eventEnd.toISOString()}',
       'City Care Clinic, MG Road, Bengaluru',
       50, 8, 'published', '${eventSlug}', '${ownerUser.id}')
  `)

  // Register 8 patients for the event
  for (let i = 0; i < 8; i++) {
    const refNo = `EVT-${eventSlug.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(4, '0')}`
    await prisma.$executeRawUnsafe(`
      INSERT INTO ${q('event_registrations')}
        (id, event_id, patient_id, reference_number, status)
      VALUES
        (gen_random_uuid(), '${eventId}', '${patients[i]!.id}', '${refNo}', 'registered')
    `)
  }

  console.log(`✓ Seeded 1 published event with 8 registrations`)

  // ── Done ───────────────────────────────────────────────────────────────

  console.log('\n✅ Seed complete!\n')
  console.log('Login credentials (OTP: 123456 in dev mode)')
  console.log('─────────────────────────────────────────────')
  console.log('  9999999999  →  Dr. Priya Sharma     (OWNER)')
  console.log('  9888888888  →  Dr. Arjun Mehta      (DOCTOR)')
  console.log('  9777777777  →  Dr. Kavitha Rao      (DOCTOR)')
  console.log('  9666666666  →  Sneha Patel          (RECEPTIONIST)')
  console.log('')
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
