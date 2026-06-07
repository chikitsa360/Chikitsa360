import { z } from 'zod'

export const clinicPlanSchema = z.enum(['STARTER', 'GROWTH', 'PRO'])

export const createClinicSchema = z.object({
  name: z.string().min(2, 'Clinic name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  plan: clinicPlanSchema.optional().default('STARTER'),
})

export const inviteStaffSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  role: z.enum(['DOCTOR', 'RECEPTIONIST']),
})

export type CreateClinicInput = z.infer<typeof createClinicSchema>
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>
export type ClinicPlan = z.infer<typeof clinicPlanSchema>
