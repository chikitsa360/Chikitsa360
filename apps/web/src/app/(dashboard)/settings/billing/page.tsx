import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getPlanStatus } from '@/lib/plan/check-plan'

export const metadata = { title: 'Billing & Subscription' }

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const PLAN_LABELS: Record<string, string> = {
  STARTER: 'Starter (Trial)',
  PRO: 'Pro',
}

export default async function BillingSettingsPage() {
  const session = await auth()
  if (!session?.user?.clinicId) redirect('/login')

  const clinic = await db.clinic.findUnique({
    where: { id: session.user.clinicId },
    select: {
      name: true,
      plan: true,
      planExpiresAt: true,
      doctorLimit: true,
    },
  })

  if (!clinic) redirect('/onboarding')

  const status = getPlanStatus(clinic.planExpiresAt)
  const isExpired = status === 'expired'
  const isExpiringSoon = status === 'expiring_soon'

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold text-foreground">Billing &amp; Subscription</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Manage your clinic subscription plan.
        </p>
      </div>

      {/* Plan status banner */}
      {(isExpired || isExpiringSoon) && (
        <div
          className="mb-5 rounded-lg border px-4 py-3 text-[13px] font-medium"
          style={
            isExpired
              ? { background: 'rgb(254 242 242)', borderColor: 'rgb(254 202 202)', color: 'rgb(153 27 27)' }
              : { background: 'rgb(255 251 235)', borderColor: 'rgb(253 230 138)', color: 'rgb(146 64 14)' }
          }
        >
          {isExpired
            ? 'Your subscription has expired. New bookings are paused. Contact us to renew.'
            : `Your subscription expires on ${formatDate(clinic.planExpiresAt!)}. Renew before it expires to avoid interruption.`}
        </div>
      )}

      {/* Current plan card */}
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-[15px] font-semibold text-foreground">Current Plan</h2>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Plan</p>
            <p className="mt-1 text-[14px] font-semibold text-foreground">
              {PLAN_LABELS[clinic.plan] ?? clinic.plan}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Expires
            </p>
            <p className="mt-1 text-[14px] font-semibold text-foreground">
              {clinic.planExpiresAt ? formatDate(clinic.planExpiresAt) : '—'}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Doctor seats
            </p>
            <p className="mt-1 text-[14px] font-semibold text-foreground">{clinic.doctorLimit}</p>
          </div>
        </div>
      </section>

      {/* Renewal section */}
      <section className="mt-5 rounded-xl border border-border bg-card p-6">
        <h2 className="text-[15px] font-semibold text-foreground">Renew or Upgrade</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          To renew your subscription or upgrade your plan, contact us and we&apos;ll get you set up
          within one business day.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="mailto:support@cliniqly.in?subject=Subscription%20Renewal%20-%20%7Bclinic%7D"
            className="inline-flex items-center gap-2 rounded-[--radius] bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email us to renew
          </a>
          <p className="text-[12px] text-muted-foreground">
            Online self-serve billing coming soon.
          </p>
        </div>
      </section>
    </div>
  )
}
