import * as React from 'react'

interface AuthCardProps {
  children: React.ReactNode
}

const FEATURES = [
  'Patient 360° profiles with full history',
  'Smart appointment scheduling',
  'EMR, prescriptions, and billing',
  'WhatsApp communication built in',
  'Multi-clinic management',
]

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-6 py-8">
      <div
        className="flex w-full max-w-[1100px] overflow-hidden rounded-2xl"
        style={{
          minHeight: 600,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px #E2E8F0',
        }}
      >
        {/* ── Left brand panel ── */}
        <div
          className="relative hidden flex-1 flex-col justify-between overflow-hidden p-12 md:flex"
          style={{ background: 'linear-gradient(155deg, #0A6EFF 0%, #0044BB 50%, #003090 100%)' }}
        >
          {/* Background orbs */}
          <div className="absolute -right-20 -top-20 h-[300px] w-[300px] rounded-full bg-white/[0.04]" />
          <div
            className="absolute -bottom-16 -left-10 h-[220px] w-[220px] rounded-full"
            style={{ background: 'rgba(79,217,255,0.08)' }}
          />

          {/* Brand logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg font-bold text-white"
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                fontSize: 18,
                letterSpacing: '-0.5px',
              }}
            >
              C3
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Chikitsa360</span>
          </div>

          {/* Tagline */}
          <div className="relative z-10">
            <h2
              className="mb-4 font-bold text-white leading-tight"
              style={{ fontSize: 28, letterSpacing: '-0.02em' }}
            >
              A complete view of every patient&apos;s healthcare journey.
            </h2>
            <p className="text-[15px] leading-relaxed text-white/70" style={{ maxWidth: 320 }}>
              Manage appointments, medical records, prescriptions, billing, and communications — all
              in one place.
            </p>
          </div>

          {/* Feature list */}
          <div className="relative z-10 flex flex-col gap-3">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-[13px] text-white/80">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: '#4FD9FF' }}
                />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div className="flex w-full flex-col justify-center bg-white p-12 md:w-[440px] md:shrink-0">
          {children}
        </div>
      </div>
    </div>
  )
}
