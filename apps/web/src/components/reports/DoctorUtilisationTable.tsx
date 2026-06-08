'use client'

interface DoctorUtilisation {
  doctorId: string
  doctorName: string
  availableSlots: number
  usedSlots: number
  utilisationPct: string | null
}

interface DoctorUtilisationTableProps {
  byDoctor: DoctorUtilisation[]
  clinicAvgPct: string
}

function utilisationClass(pct: number): string {
  if (pct >= 80) return 'text-green-700 bg-green-50'
  if (pct < 40) return 'text-amber-700 bg-amber-50'
  return 'text-[var(--color-text)]'
}

export default function DoctorUtilisationTable({ byDoctor, clinicAvgPct }: DoctorUtilisationTableProps) {
  if (byDoctor.length === 0) {
    return <p className="text-sm text-[var(--color-text-3)] text-center py-8">No doctor data for this period.</p>
  }

  return (
    <div>
      <p className="text-sm text-[var(--color-text-2)] mb-3 font-medium">
        Clinic average utilisation:{' '}
        <span className={`font-bold px-1.5 py-0.5 rounded ${utilisationClass(parseFloat(clinicAvgPct))}`}>
          {clinicAvgPct}%
        </span>
      </p>
      <p className="text-xs text-[var(--color-text-3)] mb-4 italic">
        Utilisation computed from current working hours configuration.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {['Doctor', 'Available Slots', 'Used Slots', 'Utilisation %'].map((h) => (
                <th
                  key={h}
                  className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-3)] bg-[var(--color-bg)] border-b border-[var(--color-border)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byDoctor.map((row) => {
              const pct = row.utilisationPct != null ? parseFloat(row.utilisationPct) : null
              const cls = pct != null ? utilisationClass(pct) : 'text-[var(--color-text-3)]'
              return (
                <tr key={row.doctorId} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-semibold border-b border-[var(--color-border)]">{row.doctorName}</td>
                  <td className="py-2.5 px-3 text-[var(--color-text-2)] border-b border-[var(--color-border)]">{row.availableSlots}</td>
                  <td className="py-2.5 px-3 text-[var(--color-text-2)] border-b border-[var(--color-border)]">{row.usedSlots}</td>
                  <td className="py-2.5 px-3 border-b border-[var(--color-border)]">
                    {pct != null ? (
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${cls}`}>{row.utilisationPct}%</span>
                    ) : (
                      <span className="text-[var(--color-text-3)]">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
