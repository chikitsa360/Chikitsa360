import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { checkApiRateLimit } from '@/lib/rate-limit'

const PROTECTED_PATHS = [
  '/dashboard',
  '/appointments',
  '/patients',
  '/doctors',
  '/billing',
  '/reports',
  '/settings',
]

const AUTH_PATHS = ['/login']

// Public API routes — no auth required (rate-limited separately per route)
const PUBLIC_API_PATHS = [
  '/api/v1/clinics/by-slug/',
  '/api/v1/slots/available',
  '/api/v1/booking',
  '/api/og/',
]

export default auth(async function middleware(req: NextRequest & { auth: unknown }) {
  const { pathname } = req.nextUrl
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = (req as any).auth as { user?: { clinicId?: string } } | null

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  const isAuthPath = AUTH_PATHS.some((p) => pathname.startsWith(p))
  const isApiV1 = pathname.startsWith('/api/v1/')
  const isPublicApi = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))

  // Redirect unauthenticated users away from protected pages
  if (isProtected && !session?.user) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPath && session?.user) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Skip auth checks for public API routes and booking page
  if (isPublicApi || pathname.startsWith('/book/')) {
    return NextResponse.next()
  }

  // API rate limiting (per clinicId)
  if (isApiV1 && session?.user?.clinicId) {
    const { success, retryAfter } = await checkApiRateLimit(session.user.clinicId)
    if (!success) {
      return new NextResponse(
        JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Rate limit exceeded' } }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter ?? 1),
          },
        }
      )
    }
  }

  // API auth check
  if (isApiV1 && !session?.user) {
    return new NextResponse(
      JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico|brand/).*)',
  ],
}
