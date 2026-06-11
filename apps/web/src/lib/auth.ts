import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import type { DefaultSession } from 'next-auth'
import { z } from 'zod'
import { verifyOtp } from './otp'
import { db } from './db'

// ── Type augmentation ──────────────────────────────────────────────────────

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      role: string
      clinicId: string | null
      onboardingComplete: boolean
      systemRole: string | null
    }
  }

  interface User {
    role: string
    clinicId: string | null
    onboardingComplete: boolean
    systemRole: string | null
  }
}

// ── Credentials schema ────────────────────────────────────────────────────

const credentialsSchema = z.object({
  phone: z.string().min(10),
  otp: z.string().length(6),
  nonce: z.string().min(1),
})

// ── NextAuth config ───────────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Phone OTP',
      credentials: {
        phone: { label: 'Phone', type: 'tel' },
        otp: { label: 'OTP', type: 'text' },
        nonce: { label: 'Nonce', type: 'text' },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { phone, otp, nonce } = parsed.data

        try {
          await verifyOtp(phone, nonce, otp)
        } catch {
          return null
        }

        // Look up user by phone
        const user = await db.user.findUnique({
          where: { phone },
          include: { clinic: { select: { id: true, onboardingComplete: true } } },
        })

        if (!user) return null

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: undefined,
          role: user.role,
          clinicId: user.clinicId,
          onboardingComplete: user.clinic?.onboardingComplete ?? false,
          systemRole: user.systemRole ?? null,
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  cookies: {
    sessionToken: {
      name: 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id
        token.role = user.role
        token.clinicId = user.clinicId
        token.onboardingComplete = user.onboardingComplete
        token.systemRole = user.systemRole ?? null
      }
      return token
    },

    session({ session, token }) {
      session.user.id = (token.userId as string) ?? ''
      session.user.role = (token.role as string) ?? 'RECEPTIONIST'
      session.user.clinicId = (token.clinicId as string | null) ?? null
      session.user.onboardingComplete = (token.onboardingComplete as boolean) ?? false
      session.user.systemRole = (token.systemRole as string | null) ?? null
      return session
    },

    authorized({ auth: session }) {
      return !!session
    },
  },

  pages: {
    signIn: '/login',
  },
})
