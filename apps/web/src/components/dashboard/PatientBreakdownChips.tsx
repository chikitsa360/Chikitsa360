interface PatientBreakdownChipsProps {
  newPatients: number
  returning: number
}

export function PatientBreakdownChips({ newPatients, returning }: PatientBreakdownChipsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full px-3 py-1 text-[13px] font-medium"
        style={{ background: 'rgba(10,110,255,0.1)', color: '#0A6EFF' }}>
        {newPatients} New
      </span>
      <span className="rounded-full px-3 py-1 text-[13px] font-medium"
        style={{ background: 'rgba(0,184,169,0.1)', color: '#00B8A9' }}>
        {returning} Returning
      </span>
    </div>
  )
}
