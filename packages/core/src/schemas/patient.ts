import { z } from 'zod'

export const genderSchema = z.enum(['male', 'female', 'other'])

export const createPatientSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  dob: z.string().date().optional(),
  gender: genderSchema.optional(),
  firstVisitReason: z.string().max(500).optional(),
})

export const updatePatientSchema = createPatientSchema.partial().omit({ phone: true })

export type Gender = z.infer<typeof genderSchema>
export type CreatePatientInput = z.infer<typeof createPatientSchema>
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>
