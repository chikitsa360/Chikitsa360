import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { sendQuickReply } from '@/lib/whatsapp/message-sender'
import { build24hReminderMessage } from '@/lib/notifications/build-reminder-message'
import type { Lang } from '@/lib/whatsapp/templates'

/**
 * Sends WhatsApp 24-hour appointment reminder (FR-22, Story 7.1).
 * Includes "Cancel Appointment" Quick Reply button.
 * Checks: appointment confirmed + clinic toggle enabled + patient not opted out.
 */
export const appointmentReminder24h = inngest.createFunction(
  { id: 'appointment-reminder-24h', name: 'Appointment: Send 24h Reminder' },
  { event: 'appointment/reminder-24h.send' },
  async ({ event }) => {
    const { appointmentId, clinicId } = event.data as { appointmentId: string; clinicId: string }
    const schemaName = `clinic_${clinicId}`

    // Load clinic (includes toggle + WA config)
    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: {
        name: true,
        address: true,
        language: true,
        whatsappPhoneNumberId: true,
        reminder24hEnabled: true,
      },
    })
    if (!clinic?.whatsappPhoneNumberId) return { sent: false, reason: 'clinic_not_configured' }

    // Guard: clinic reminder toggle (Story 7.2)
    if (!clinic.reminder24hEnabled) return { sent: false, reason: 'toggle_disabled' }

    // Load appointment
    const aptRows = await db.$queryRawUnsafe<{
      status: string
      token_number: number | null
      appointment_date: string
      is_sample: boolean
      patient_id: string
      doctor_id: string
      slot_id: string | null
    }[]>(
      `SELECT status, token_number, appointment_date::text, is_sample,
              patient_id, doctor_id, slot_id
       FROM "${schemaName}".appointments WHERE id = $1::uuid LIMIT 1`,
      appointmentId
    )
    const apt = aptRows[0]
    if (!apt) return { sent: false, reason: 'appointment_not_found' }

    // Guard: only confirmed appointments get reminders
    if (apt.status !== 'confirmed') return { sent: false, reason: 'not_confirmed' }

    // Guard: sample appointments are skipped
    if (apt.is_sample) return { sent: false, reason: 'sample_appointment' }

    // Load patient
    const patientRows = await db.$queryRawUnsafe<{
      name: string
      phone: string
      whatsapp_opt_out_at: string | null
    }[]>(
      `SELECT name, phone, whatsapp_opt_out_at FROM "${schemaName}".patients WHERE id = $1::uuid LIMIT 1`,
      apt.patient_id
    )
    const patient = patientRows[0]
    if (!patient) return { sent: false, reason: 'patient_not_found' }

    // Opt-out check: skip WA, send SMS directly (Story 7.3)
    if (patient.whatsapp_opt_out_at) {
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".appointments
         SET delivery_failures = COALESCE(delivery_failures, '[]'::jsonb) || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2::uuid`,
        JSON.stringify([{ channel: 'whatsapp-skipped-optout', reminderType: '24h', at: new Date().toISOString() }]),
        appointmentId
      )
      await inngest.send({
        name: 'appointment/sms-fallback.send',
        data: { appointmentId, clinicId, channel: 'reminder-24h' },
      })
      return { sent: false, reason: 'patient_opted_out', smsFallbackScheduled: true }
    }

    // Load doctor
    const doctorRows = await db.$queryRawUnsafe<{ name: string }[]>(
      `SELECT name FROM "${schemaName}".doctors WHERE id = $1::uuid LIMIT 1`,
      apt.doctor_id
    )
    const doctor = doctorRows[0]

    // Load slot start time
    let startTime = '00:00'
    if (apt.slot_id) {
      const slotRows = await db.$queryRawUnsafe<{ start_time: string }[]>(
        `SELECT start_time::text FROM "${schemaName}".slots WHERE id = $1::uuid LIMIT 1`,
        apt.slot_id
      )
      startTime = slotRows[0]?.start_time ?? '00:00'
    }

    const lang = (clinic.language ?? 'en') as Lang
    const message = build24hReminderMessage({
      patientFirstName: patient.name.split(' ')[0] ?? patient.name,
      tokenNumber: apt.token_number ?? 0,
      doctorName: doctor?.name ?? 'Doctor',
      date: apt.appointment_date,
      startTime,
      clinicName: clinic.name,
      address: clinic.address,
      language: lang,
    })

    // Send with Cancel Appointment Quick Reply button
    const result = await sendQuickReply(
      clinic.whatsappPhoneNumberId,
      patient.phone,
      message,
      [{ id: `CANCEL_APPOINTMENT:${appointmentId}`, title: 'Cancel Appointment' }]
    )

    if (result.success) {
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".appointments
         SET reminder_24h_sent_at = NOW(), updated_at = NOW()
         WHERE id = $1::uuid`,
        appointmentId
      )
    } else {
      await db.$executeRawUnsafe(
        `UPDATE "${schemaName}".appointments
         SET delivery_failures = COALESCE(delivery_failures, '[]'::jsonb) || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2::uuid`,
        JSON.stringify([{ channel: 'whatsapp-reminder-24h', failedAt: new Date().toISOString(), reason: result.error }]),
        appointmentId
      )
      await inngest.send({
        name: 'appointment/sms-fallback.send',
        data: { appointmentId, clinicId, channel: 'reminder-24h' },
      })
    }

    return { sent: result.success }
  }
)
