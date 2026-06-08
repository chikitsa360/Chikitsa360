'use client'

interface Doctor {
  id: string
  name: string
}

interface DoctorFilterProps {
  doctors: Doctor[]
  value: string | null
  onChange: (doctorId: string | null) => void
}

export default function DoctorFilter({ doctors, value, onChange }: DoctorFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-9 pl-3 pr-8 text-sm border border-[var(--color-border)] rounded-lg bg-white text-[var(--color-text-2)] appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
        }}
      >
        <option value="">All Doctors</option>
        {doctors.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
      </select>

      {value && (
        <button
          onClick={() => onChange(null)}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full"
        >
          Filtered: {doctors.find((d) => d.id === value)?.name ?? 'Doctor'}
          <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      )}
    </div>
  )
}
