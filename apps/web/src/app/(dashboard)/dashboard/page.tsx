import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

// ── Stat card ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: string
  trend?: string
  trendUp?: boolean
  iconBg: string
  iconColor: string
  valueColor?: string
  icon: React.ReactNode
}

function StatCard({ label, value, trend, trendUp, iconBg, iconColor, valueColor, icon }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div
          className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
          style={{ marginBottom: 12 }}
        >
          {label}
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-md"
          style={{ background: iconBg, color: iconColor }}
        >
          {icon}
        </div>
      </div>
      <div
        className="font-bold leading-none tracking-tight"
        style={{
          fontSize: 32,
          color: valueColor ?? 'var(--color-foreground)',
          marginBottom: 8,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {trend && (
        <div
          className="flex items-center gap-1 text-[12px] font-medium"
          style={{ color: trendUp === true ? '#10B981' : trendUp === false ? '#EF4444' : '#64748B' }}
        >
          {trendUp != null && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              {trendUp
                ? <polyline points="18 15 12 9 6 15" />
                : <polyline points="6 9 12 15 18 9" />}
            </svg>
          )}
          {trend}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────

import * as React from 'react'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const firstName = session.user.name?.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      {/* Greeting */}
      <div className="mb-5">
        <div
          className="font-bold text-foreground"
          style={{ fontSize: 20, letterSpacing: '-0.015em' }}
        >
          {greeting}, {firstName}
        </div>
        <div className="mt-1 text-[13px] text-muted-foreground">
          Here&apos;s what&apos;s happening at your clinic today.
        </div>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Today's Appointments"
          value="24"
          trend="+3 vs yesterday"
          trendUp={true}
          iconBg="rgba(10,110,255,0.08)"
          iconColor="#0A6EFF"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          }
        />
        <StatCard
          label="Currently Waiting"
          value="4"
          trend="In waiting room now"
          iconBg="rgba(139,92,246,0.08)"
          iconColor="#8B5CF6"
          valueColor="#8B5CF6"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />
        <StatCard
          label="Revenue Today"
          value="₹18,400"
          trend="+12% this week"
          trendUp={true}
          iconBg="rgba(16,185,129,0.08)"
          iconColor="#10B981"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          }
        />
        <StatCard
          label="Follow-ups Due"
          value="7"
          trend="2 overdue"
          trendUp={false}
          iconBg="rgba(245,158,11,0.08)"
          iconColor="#F59E0B"
          valueColor="#F59E0B"
          icon={
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">

        {/* Today's appointments queue */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="text-[14px] font-semibold text-foreground">Today&apos;s Appointments</div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-muted-foreground">Showing 5 of 24</span>
              <a href="/appointments" className="text-[12px] font-medium text-primary hover:underline">
                View all →
              </a>
            </div>
          </div>
          {/* Appointment rows */}
          {[
            { time: '9:30', name: 'Meena Kulkarni', doctor: 'Dr. Iyer · Cardiologist', status: 'Waiting', statusStyle: { background: 'rgba(139,92,246,0.1)', color: '#7C3AED' } },
            { time: '10:00', name: 'Anjali Sharma', doctor: 'Dr. Patel · General', status: 'Confirmed', statusStyle: { background: 'rgba(16,185,129,0.1)', color: '#059669' }, highlight: true },
            { time: '10:30', name: 'Priya Kapoor', doctor: 'Dr. Mehta · General', status: 'Scheduled', statusStyle: { background: 'rgba(59,130,246,0.1)', color: '#2563EB' } },
            { time: '11:00', name: 'Vikram Desai', doctor: 'Dr. Iyer · Cardiologist', status: 'Scheduled', statusStyle: { background: 'rgba(59,130,246,0.1)', color: '#2563EB' } },
            { time: '11:30', name: 'Nisha Rao', doctor: 'Dr. Mehta · General', status: 'No-show', statusStyle: { background: 'rgba(245,158,11,0.1)', color: '#D97706' } },
          ].map((row) => (
            <div
              key={row.name}
              className="flex items-center gap-3 border-b border-border px-5 py-3 hover:bg-muted transition-colors cursor-pointer"
              style={row.highlight ? { background: 'rgba(10,110,255,0.02)', borderLeft: '2px solid #0A6EFF' } : undefined}
            >
              <div
                className="w-[50px] shrink-0 text-[12px] font-semibold text-muted-foreground"
                style={{ fontVariantNumeric: 'tabular-nums', color: row.highlight ? '#0A6EFF' : undefined }}
              >
                {row.time}
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold text-white">
                {row.name.split(' ').map((p) => p[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-foreground truncate">{row.name}</div>
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {row.doctor}
                </div>
              </div>
              <span
                className="shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium"
                style={row.statusStyle}
              >
                {row.status}
              </span>
            </div>
          ))}
          <div className="bg-muted px-5 py-3 text-center text-[12px] text-muted-foreground">
            + 19 more appointments today
          </div>
        </div>

        {/* Right panels */}
        <div className="flex flex-col gap-4">

          {/* Quick Actions */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <div className="text-[14px] font-semibold text-foreground">Quick Actions</div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              {[
                { label: 'New Patient', bg: 'rgba(10,110,255,0.1)', color: '#0A6EFF' },
                { label: 'Book Appointment', bg: 'rgba(0,184,169,0.1)', color: '#00B8A9' },
                { label: 'New Prescription', bg: 'rgba(139,92,246,0.1)', color: '#8B5CF6' },
                { label: 'New Invoice', bg: 'rgba(16,185,129,0.1)', color: '#10B981' },
              ].map((qa) => (
                <button
                  key={qa.label}
                  className="rounded-md border border-border bg-muted p-3 text-left hover:border-primary hover:bg-card transition-colors"
                >
                  <div
                    className="mb-2 flex h-7 w-7 items-center justify-center rounded"
                    style={{ background: qa.bg, color: qa.color }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                  <div className="text-[12px] font-medium text-foreground leading-tight">{qa.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Follow-ups Due */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="text-[14px] font-semibold text-foreground">Follow-ups Due</div>
              <a href="/patients" className="text-[12px] font-medium text-primary hover:underline">Send all →</a>
            </div>
            {[
              { name: 'Meena Kulkarni', due: '2 days overdue', dueColor: '#EF4444' },
              { name: 'Vikram Desai', due: 'Overdue by 1 day', dueColor: '#EF4444' },
              { name: 'Rajesh Singh', due: 'Due today', dueColor: '#F59E0B' },
            ].map((f) => (
              <div key={f.name} className="flex items-center gap-2.5 border-b border-border px-5 py-2.5 hover:bg-muted transition-colors cursor-pointer">
                <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-warning/10 text-[11px] font-semibold text-warning">
                  {f.name.split(' ').map((p) => p[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-foreground">{f.name}</div>
                  <div className="text-[11px] font-medium" style={{ color: f.dueColor }}>{f.due}</div>
                </div>
                <button className="shrink-0 rounded border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-muted transition-colors">
                  WhatsApp
                </button>
              </div>
            ))}
            <div className="px-5 py-2.5">
              <div className="text-[11px] text-muted-foreground">+ 4 more follow-ups due this week</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
