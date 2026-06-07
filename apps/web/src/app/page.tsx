import { brand } from '@/lib/brand'
import { BrandLogo } from '@/components/BrandLogo'
import {
  Button,
  Badge,
  Card, CardHeader, CardTitle, CardContent, CardFooter,
  Input,
  Select,
  Spinner,
  Avatar, AvatarGroup,
  StatCard,
  EmptyState,
  Divider,
  Alert,
} from '@chikitsa360/ui'

// ── Icons (inline SVG, no extra dep) ──────────────────────────────────────────
const Icons = {
  patients: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20H7a2 2 0 01-2-2v-1a5 5 0 015-5h4a5 5 0 015 5v1a2 2 0 01-2 2z" />
      <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  calendar: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  revenue: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" />
    </svg>
  ),
  satisfaction: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 14.5s1.5 2 3.5 2 3.5-2 3.5-2M9 9h.01M15 9h.01" />
    </svg>
  ),
  search: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
    </svg>
  ),
  inbox: (
    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m13-4l-5 4-5-4" />
    </svg>
  ),
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] font-sans">

      {/* ── Top Nav ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-white/80 px-6 backdrop-blur-md">
        <BrandLogo height={36} />
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">Help</Button>
          <Avatar name="Dr. Priya Mehta" size="sm" />
        </div>
      </nav>

      <div className="mx-auto max-w-6xl space-y-10 px-6 py-10">

        {/* ── Welcome Banner ───────────────────────────────────────────────── */}
        <div
          className="rounded-2xl px-8 py-10 text-white"
          style={{ background: 'linear-gradient(135deg, #1b40af 0%, #008f7a 100%)' }}
        >
          <p className="text-sm font-medium uppercase tracking-widest text-white/60 mb-1">Good morning</p>
          <h1 className="text-3xl font-bold mb-1">Dr. Priya Mehta</h1>
          <p className="text-white/70 mb-6">
            {brand.meta.tagline} — Saturday, 7 June 2026
          </p>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-white !text-primary hover:bg-white/90 shadow">
              New Appointment
            </Button>
            <Button variant="outline" className="border-white/30 text-white hover:bg-white/10">
              View Schedule
            </Button>
          </div>
        </div>

        {/* ── Stat Cards ───────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-4">Today&apos;s Overview</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Patients" value="1,284"  previousValue={1200} variant="primary"  icon={Icons.patients}    />
            <StatCard label="Appointments"   value={24}     previousValue={20}   variant="teal"    icon={Icons.calendar}    />
            <StatCard label="Revenue"        value="₹84,200" previousValue={72000} variant="success" icon={Icons.revenue}    />
            <StatCard label="Satisfaction"   value="98%"    trend="up"           variant="warning" icon={Icons.satisfaction} />
          </div>
        </section>

        {/* ── Alerts ───────────────────────────────────────────────────────── */}
        <section className="space-y-3">
          <Alert variant="info" title="System Update">
            Scheduled maintenance tonight 11 PM – 1 AM. Some features may be temporarily unavailable.
          </Alert>
          <Alert variant="success">
            Lab results for Patient #4821 are now available.
          </Alert>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ── Patient Search Form ──────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <CardTitle>Find Patient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Patient Name or ID"
                placeholder="Search patients…"
                leftIcon={Icons.search}
              />
              <Select
                label="Department"
                placeholder="All departments"
                options={[
                  { label: 'General Medicine', value: 'general' },
                  { label: 'Cardiology', value: 'cardiology' },
                  { label: 'Orthopaedics', value: 'ortho' },
                  { label: 'Paediatrics', value: 'paeds' },
                ]}
              />
              <Input
                label="Date of Visit"
                type="date"
                hint="Leave blank to search all dates"
              />
            </CardContent>
            <CardFooter className="gap-2">
              <Button className="flex-1">Search</Button>
              <Button variant="outline">Clear</Button>
            </CardFooter>
          </Card>

          {/* ── Upcoming Appointments ────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Upcoming Appointments</CardTitle>
                <Badge variant="default">Today</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'Rahul Sharma',  time: '10:00 AM', type: 'Consultation', status: 'confirmed' as const },
                { name: 'Meena Iyer',    time: '11:30 AM', type: 'Follow-up',    status: 'default' as const },
                { name: 'Arjun Patil',   time: '02:00 PM', type: 'Lab Review',   status: 'warning' as const },
                { name: 'Sonal Desai',   time: '04:15 PM', type: 'New Patient',  status: 'default' as const },
              ].map((apt) => (
                <div key={apt.name} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Avatar name={apt.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{apt.name}</p>
                    <p className="text-xs text-muted-foreground">{apt.time} · {apt.type}</p>
                  </div>
                  <Badge variant={apt.status === 'confirmed' ? 'success' : apt.status}>
                    {apt.status === 'confirmed' ? 'Confirmed' : apt.status === 'warning' ? 'Pending' : 'Scheduled'}
                  </Badge>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button variant="ghost" size="sm" className="w-full">View All Appointments →</Button>
            </CardFooter>
          </Card>
        </div>

        {/* ── Team / Avatar Group ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Care Team On Duty</CardTitle>
              <AvatarGroup
                size="sm"
                avatars={[
                  { name: 'Dr. Priya Mehta' },
                  { name: 'Dr. Sameer Khan' },
                  { name: 'Nurse Asha R.' },
                  { name: 'Dr. Vijay P.' },
                  { name: 'Lab Tech Neha' },
                ]}
                max={4}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { name: 'Dr. Priya Mehta',  role: 'General Physician' },
                { name: 'Dr. Sameer Khan',  role: 'Cardiologist' },
                { name: 'Nurse Asha R.',    role: 'Head Nurse' },
                { name: 'Dr. Vijay P.',     role: 'Radiologist' },
              ].map((member) => (
                <div key={member.name} className="flex items-center gap-2 rounded-lg bg-muted p-3">
                  <Avatar name={member.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{member.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Component Showcase ───────────────────────────────────────────── */}
        <Divider label="Component Library" />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

          {/* Buttons */}
          <Card>
            <CardHeader><CardTitle>Buttons</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm">Primary</Button>
              <Button variant="secondary" size="sm">Secondary</Button>
              <Button variant="outline" size="sm">Outline</Button>
              <Button variant="ghost" size="sm">Ghost</Button>
              <Button variant="destructive" size="sm">Destructive</Button>
              <Button isLoading size="sm">Loading</Button>
            </CardContent>
          </Card>

          {/* Badges */}
          <Card>
            <CardHeader><CardTitle>Badges</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge variant="default">Active</Badge>
              <Badge variant="success">Confirmed</Badge>
              <Badge variant="warning">Pending</Badge>
              <Badge variant="destructive">Cancelled</Badge>
              <Badge variant="secondary">Draft</Badge>
            </CardContent>
          </Card>

          {/* Spinners */}
          <Card>
            <CardHeader><CardTitle>Spinners</CardTitle></CardHeader>
            <CardContent className="flex items-center gap-6">
              <Spinner size="sm" />
              <Spinner size="md" />
              <Spinner size="lg" />
              <Spinner size="xl" />
            </CardContent>
          </Card>

          {/* Empty State */}
          <Card className="col-span-1 sm:col-span-2 lg:col-span-3">
            <CardContent className="pt-6">
              <EmptyState
                icon={Icons.inbox}
                title="No messages yet"
                description="When patients or staff send you messages, they'll appear here."
                action={<Button size="sm">Compose Message</Button>}
              />
            </CardContent>
          </Card>
        </div>

      </div>
    </main>
  )
}
