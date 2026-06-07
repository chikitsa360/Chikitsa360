'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@chikitsa360/core'
import { useTranslations } from 'next-intl'
import { UserMenu } from './UserMenu'

// ── Inline SVG icons (16×16 to match mockup) ───────────────────────────────

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    {children}
  </svg>
)

const DashboardIcon = () => <Icon><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></Icon>
const AppointmentsIcon = () => <Icon><rect x="3" y="4" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" /></Icon>
const PatientsIcon = () => <Icon><path strokeLinecap="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></Icon>
const DoctorsIcon = () => <Icon><path strokeLinecap="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Icon>
const PrescriptionsIcon = () => <Icon><path strokeLinecap="round" d="M9 12l2 2 4-4" /><path strokeLinecap="round" d="M21 12c0 5-4 9-9 9s-9-4-9-9 4-9 9-9 9 4 9 9z" /></Icon>
const BillingIcon = () => <Icon><path strokeLinecap="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></Icon>
const ReportsIcon = () => <Icon><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Icon>
const ChevronDown = () => (
  <svg className="h-3.5 w-3.5 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" d="M7 10l5 5 5-5" />
  </svg>
)
const DotsIcon = () => (
  <svg className="h-3.5 w-3.5 shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
  </svg>
)

// ── Nav config ─────────────────────────────────────────────────────────────

interface NavItemDef {
  key: string
  href: string
  icon: React.ReactNode
  roles?: string[]
  badge?: number
  badgeVariant?: 'primary' | 'warning'
  section: 'main' | 'insights'
}

const NAV_ITEMS: NavItemDef[] = [
  { key: 'dashboard',     href: '/dashboard',     icon: <DashboardIcon />,     section: 'main' },
  { key: 'appointments',  href: '/appointments',  icon: <AppointmentsIcon />,  section: 'main' },
  { key: 'patients',      href: '/patients',      icon: <PatientsIcon />,      section: 'main' },
  { key: 'doctors',       href: '/doctors',       icon: <DoctorsIcon />,       section: 'main', roles: ['OWNER'] },
  { key: 'prescriptions', href: '/prescriptions', icon: <PrescriptionsIcon />, section: 'main' },
  { key: 'billing',       href: '/billing',       icon: <BillingIcon />,       section: 'main', roles: ['OWNER'] },
  { key: 'reports',       href: '/reports',       icon: <ReportsIcon />,       section: 'insights' },
]

// ── User avatar initials helper ────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// ── Component ──────────────────────────────────────────────────────────────

interface SidebarProps {
  userRole?: string
  userName?: string
  clinicName?: string
}

export function Sidebar({ userRole, userName, clinicName }: SidebarProps) {
  const t = useTranslations('nav')
  const pathname = usePathname()

  const mainItems = NAV_ITEMS.filter(
    (item) => item.section === 'main' && (!item.roles || !userRole || item.roles.includes(userRole))
  )
  const insightItems = NAV_ITEMS.filter(
    (item) => item.section === 'insights'
  )

  return (
    <aside
      className="relative hidden h-full w-60 shrink-0 flex-col border-r border-border bg-card lg:flex overflow-y-auto"
      aria-label="Main navigation"
    >
      {/* ── Clinic header ─────────────────────────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
        {/* Brand icon */}
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded font-bold text-white"
          style={{ background: '#0A6EFF', fontSize: 11, letterSpacing: '-0.5px' }}
        >
          C3
        </div>
        {/* Clinic info */}
        <div className="flex-1 min-w-0">
          <div className="truncate text-[13px] font-semibold text-foreground leading-tight">
            {clinicName ?? 'Clinic'}
          </div>
          <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
            {userRole ? userRole.charAt(0) + userRole.slice(1).toLowerCase() : 'Staff'}
          </div>
        </div>
        <ChevronDown />
      </div>

      {/* ── Search ────────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-2.5 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-muted-foreground"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            className={cn(
              'h-8 w-full rounded-md border border-border bg-muted pl-7 pr-10 text-[12px]',
              'text-muted-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-1 focus:ring-ring'
            )}
            placeholder="Search patients, appts..."
            readOnly
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-border bg-card px-1 text-[10px] text-muted-foreground">
            ⌘K
          </span>
        </div>
      </div>

      {/* ── Main section ──────────────────────────────────────────────── */}
      <div className="px-3 pb-1 pt-3">
        <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Main
        </div>
        <ul>
          {mainItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'mb-0.5 flex h-9 items-center gap-2.5 rounded-md px-3 text-[13px] font-medium transition-colors duration-100',
                    isActive
                      ? 'bg-primary/[0.08] text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.icon}
                  <span className="flex-1 truncate">{t(item.key)}</span>
                  {item.badge != null && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-px text-[10px] font-semibold text-white',
                        item.badgeVariant === 'warning' ? 'bg-warning' : 'bg-primary'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* ── Insights section ──────────────────────────────────────────── */}
      <div className="px-3 pb-1 pt-3">
        <div className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          Insights
        </div>
        <ul>
          {insightItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'mb-0.5 flex h-9 items-center gap-2.5 rounded-md px-3 text-[13px] font-medium transition-colors duration-100',
                    isActive
                      ? 'bg-primary/[0.08] text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.icon}
                  <span className="truncate">{t(item.key)}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* ── Spacer ────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ── User footer ───────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-muted transition-colors">
          {/* Avatar */}
          <div
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
            style={{ background: 'rgba(10,110,255,0.1)', color: '#0A6EFF' }}
          >
            {userName ? initials(userName) : 'U'}
          </div>
          {/* Name + role */}
          <div className="flex-1 min-w-0">
            <div className="truncate text-[12px] font-semibold text-foreground leading-tight">
              {userName ?? 'User'}
            </div>
            <div className="text-[11px] text-muted-foreground leading-tight">
              {userRole
                ? userRole.charAt(0) + userRole.slice(1).toLowerCase()
                : 'Staff'}
            </div>
          </div>
          {/* 3-dot user menu */}
          <UserMenu userName={userName} userRole={userRole} trigger={<DotsIcon />} />
        </div>
      </div>
    </aside>
  )
}
