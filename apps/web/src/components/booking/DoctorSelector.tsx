'use client'

interface Doctor {
  id: string
  name: string
}

interface DoctorSelectorProps {
  doctors: Doctor[]
  selectedDoctorId: string | null
  onSelect: (doctorId: string | null) => void
}

export function DoctorSelector({ doctors, selectedDoctorId, onSelect }: DoctorSelectorProps) {
  if (doctors.length <= 1) return null

  return (
    <div className="mb-5">
      <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
        Doctor
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Select a doctor">
        <button
          onClick={() => onSelect(null)}
          aria-pressed={selectedDoctorId === null}
          className={pillClass(selectedDoctorId === null)}
        >
          All Doctors
        </button>
        {doctors.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onSelect(doc.id)}
            aria-pressed={selectedDoctorId === doc.id}
            className={pillClass(selectedDoctorId === doc.id)}
          >
            {doc.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function pillClass(active: boolean) {
  return [
    'rounded-full px-4 py-2 text-[13px] font-medium transition-colors border',
    active
      ? 'bg-primary text-white border-primary'
      : 'bg-card text-foreground border-border hover:border-primary hover:text-primary',
  ].join(' ')
}
