import { z } from 'zod'

export const appointmentStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no-show',
])

export const createAppointmentSchema = z.object({
  patientId: z.string().uuid(),
  doctorId: z.string().uuid(),
  slotId: z.string().uuid().optional(),
  bookingSource: z.enum(['portal', 'whatsapp', 'walk-in']).default('portal'),
  tokenNumber: z.number().int().positive().optional(),
})

export const updateAppointmentSchema = z.object({
  status: appointmentStatusSchema.optional(),
  tokenNumber: z.number().int().positive().optional(),
})

export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>
