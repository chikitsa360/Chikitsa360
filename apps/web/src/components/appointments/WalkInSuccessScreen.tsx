'use client'

interface WalkInSuccessScreenProps {
  tokenNumber: number
  patientName: string
  doctorName: string
  time: string
  isOverflow: boolean
  onRegisterAnother: () => void
  onDone: () => void
}

/**
 * Token success screen for walk-in registration (UX-DR35).
 * Token number displayed at 72px bold — designed to be visible across the reception desk.
 * Must NOT auto-dismiss — Receptionist taps "Done" or "Register Another".
 */
export function WalkInSuccessScreen({
  tokenNumber,
  patientName,
  doctorName,
  time,
  isOverflow,
  onRegisterAnother,
  onDone,
}: WalkInSuccessScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center">
      {/* Token number — primary focus */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        className="mb-4"
      >
        <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
          Token Number
        </div>
        <div className="text-[72px] font-bold leading-none text-primary" style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>
          #{tokenNumber}
        </div>
      </div>

      {/* Patient + appointment info */}
      <div className="mb-6 space-y-1">
        <div className="text-[18px] font-semibold text-foreground">{patientName}</div>
        <div className="text-[14px] text-muted-foreground">
          {doctorName} · {time} today
        </div>
      </div>

      {/* Overflow note */}
      {isOverflow && (
        <div className="mb-6 rounded-lg border-l-4 border-amber-400 bg-amber-50 border border-amber-200 px-4 py-2 text-[12px] text-amber-700 text-left">
          <strong>Overflow booking</strong> — please inform the affected patient manually.
        </div>
      )}

      {/* Actions */}
      <div className="flex w-full flex-col gap-3 mt-auto">
        <button
          onClick={onRegisterAnother}
          className="w-full h-12 rounded-lg border-2 border-primary text-[14px] font-semibold text-primary hover:bg-primary/5 transition-colors"
        >
          Register Another Walk-In
        </button>
        <button
          onClick={onDone}
          className="w-full h-12 rounded-lg bg-card border border-border text-[14px] font-medium text-foreground hover:bg-muted transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  )
}
