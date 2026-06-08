'use client'

interface BookingSuccessProps {
  tokenNumber: number
  doctorName: string
  date: string // YYYY-MM-DD
  startTime: string // HH:mm
  clinicName: string
  clinicAddress: string
  patientPhone: string
  whatsappPhone?: string
  onBookAnother: () => void
}

export function BookingSuccess({
  tokenNumber,
  doctorName,
  date,
  startTime,
  clinicName,
  clinicAddress,
  patientPhone,
  whatsappPhone,
  onBookAnother,
}: BookingSuccessProps) {
  const formattedDate = formatDate(date)
  const formattedTime = formatTime(startTime)
  const maskedPhone = maskPhone(patientPhone)

  return (
    <div aria-live="polite" className="text-center">
      {/* Checkmark icon */}
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
        <svg
          className="h-8 w-8 text-success"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 className="mb-1 text-[22px] font-bold text-foreground">Appointment Confirmed!</h1>
      <p className="mb-6 text-[14px] text-muted-foreground">
        Your confirmation has been sent to {maskedPhone} via WhatsApp.
      </p>

      {/* Details card */}
      <div className="mb-6 rounded-xl border border-border bg-card p-5 text-left shadow-sm">
        <div className="mb-4 rounded-lg bg-primary/5 px-4 py-3 text-center">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">Token Number</p>
          <p className="text-[32px] font-bold text-primary">#{tokenNumber}</p>
        </div>
        <dl className="space-y-2.5">
          <DetailRow label="Doctor" value={`Dr. ${doctorName}`} />
          <DetailRow label="Date & Time" value={`${formattedDate} at ${formattedTime} IST`} />
          <DetailRow label="Clinic" value={`${clinicName}, ${clinicAddress}`} />
        </dl>
      </div>

      {/* Add to WhatsApp */}
      {whatsappPhone && (
        <a
          href={`https://wa.me/${whatsappPhone.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#25D366] bg-[#25D366]/5 text-[14px] font-semibold text-[#128C7E] transition-colors hover:bg-[#25D366]/10"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366]" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          Add Clinic to WhatsApp
        </a>
      )}

      <button
        onClick={onBookAnother}
        className="flex h-11 w-full items-center justify-center rounded-lg border border-border bg-card text-[14px] font-semibold text-foreground transition-colors hover:bg-muted"
      >
        Book Another Appointment
      </button>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="w-[100px] flex-shrink-0 text-[12px] font-semibold text-muted-foreground">{label}</dt>
      <dd className="text-[13px] text-foreground">{value}</dd>
    </div>
  )
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1)
  return dt.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(time: string): string {
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr ?? '0', 10)
  const m = parseInt(mStr ?? '0', 10)
  const period = h >= 12 ? 'PM' : 'AM'
  const displayH = h % 12 || 12
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`
}

function maskPhone(phone: string): string {
  if (phone.length < 4) return phone
  return `+91 XXXXXX${phone.slice(-4)}`
}
