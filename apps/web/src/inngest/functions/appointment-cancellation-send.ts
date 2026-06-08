import { inngest } from '@/lib/inngest'
import { db } from '@/lib/db'
import { sendText } from '@/lib/whatsapp/message-sender'
import type { Lang } from '@/lib/whatsapp/templates'

/**
 * Sends a WhatsApp cancellation acknowledgment to the patient (Story 5.4).
 * Triggered when a Receptionist or Owner cancels an appointment.
 * Uses Inngest idempotency key: `${appointmentId}:cancellation`.
 */
export const appointmentCancellationSend = inngest.createFunction(
  { id: 'appointment-cancellation-send', name: 'Appointment: Send WhatsApp Cancellation' },
  { event: 'appointment/cancellation.send' },
  async ({ event }) => {
    const { appointmentId, clinicId } = event.data as { appointmentId: string; clinicId: string }
    const schemaName = `clinic_${clinicId}`

    // Load appointment
    const aptRows = await db.$queryRawUnsafe<{
      status: string
      appointment_date: string
      appointment_time: string | null
      patient_id: string
      doctor_id: string
    }[]>(
      `SELECT status, appointment_date::text, appointment_time::text, patient_id, doctor_id
       FROM "${schemaName}".appointments WHERE id = $1::uuid LIMIT 1`,
      appointmentId
    )
    const apt = aptRows[0]
    if (!apt) return { sent: false, reason: 'appointment_not_found' }
    if (apt.status !== 'cancelled') return { sent: false, reason: 'not_cancelled' }

    // Load patient
    const patientRows = await db.$queryRawUnsafe<{
      name: string
      phone: string
      whatsapp_opt_out_at: string | null
    }[]>(
      `SELECT name, phone, whatsapp_opt_out_at
       FROM "${schemaName}".patients WHERE id = $1::uuid LIMIT 1`,
      apt.patient_id
    )
    const patient = patientRows[0]
    if (!patient) return { sent: false, reason: 'patient_not_found' }

    if (patient.whatsapp_opt_out_at) {
      return { sent: false, reason: 'patient_opted_out' }
    }

    // Load doctor
    const doctorRows = await db.$queryRawUnsafe<{ name: string }[]>(
      `SELECT name FROM "${schemaName}".doctors WHERE id = $1::uuid LIMIT 1`,
      apt.doctor_id
    )
    const doctor = doctorRows[0]

    // Load clinic
    const clinic = await db.clinic.findUnique({
      where: { id: clinicId },
      select: {
        name: true,
        language: true,
        whatsappPhoneNumberId: true,
      },
    })
    if (!clinic?.whatsappPhoneNumberId) return { sent: false, reason: 'clinic_not_configured' }

    const lang = (clinic.language ?? 'en') as Lang

    // Format date and time for message
    const dateParts = apt.appointment_date.split('-')
    const dateLabel =
      dateParts.length === 3
        ? new Date(
            parseInt(dateParts[0] ?? '0'),
            parseInt(dateParts[1] ?? '1') - 1,
            parseInt(dateParts[2] ?? '1')
          ).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
        : apt.appointment_date

    const timeParts = (apt.appointment_time ?? '00:00').slice(0, 5).split(':')
    const h = parseInt(timeParts[0] ?? '0', 10)
    const m = timeParts[1] ?? '00'
    const period = h >= 12 ? 'PM' : 'AM'
    const displayH = h % 12 || 12
    const timeLabel = `${displayH}:${m} ${period}`

    const message =
      lang === 'hi'
        ? `नमस्ते ${patient.name.split(' ')[0] ?? patient.name},\n\nआपकी ${clinic.name} में Dr. ${doctor?.name ?? 'डॉक्टर'} के साथ ${dateLabel} को ${timeLabel} की अपॉइंटमेंट रद्द कर दी गई है।\n\nपुनः बुकिंग के लिए हमसे संपर्क करें।`
        : `Hi ${patient.name.split(' ')[0] ?? patient.name},\n\nYour appointment with Dr. ${doctor?.name ?? 'Doctor'} at ${clinic.name} on ${dateLabel} at ${timeLabel} has been cancelled.\n\nPlease contact us to reschedule.`

    const result = await sendText(clinic.whatsappPhoneNumberId, patient.phone, message)

    return { sent: result.success, messageId: result.messageId }
  }
)
