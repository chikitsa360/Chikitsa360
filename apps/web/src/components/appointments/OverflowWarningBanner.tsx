'use client'

interface OverflowWarningBannerProps {
  doctorName: string
  onOverride: () => void
  onCancel: () => void
}

/**
 * Amber warning banner for walk-in overflow (UX-DR44).
 * Blocks confirm action until Receptionist explicitly reads and taps "Override Anyway".
 */
export function OverflowWarningBanner({ doctorName, onOverride, onCancel }: OverflowWarningBannerProps) {
  return (
    <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 border border-amber-200 px-4 py-3">
      <div className="flex items-start gap-2 mb-3">
        <span className="text-amber-600 text-lg leading-none mt-0.5">⚠</span>
        <div>
          <div className="text-[13px] font-semibold text-amber-800 mb-1">
            Today is fully booked for {doctorName}.
          </div>
          <p className="text-[12px] text-amber-700">
            Walk-in overflow will override a booked slot — the affected patient will{' '}
            <strong>NOT</strong> be notified automatically.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-9 rounded-lg border border-amber-300 text-[12px] font-medium text-amber-700 hover:bg-amber-100 transition-colors bg-transparent"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onOverride}
          className="flex-1 h-9 rounded-lg bg-amber-500 text-[12px] font-semibold text-white hover:bg-amber-600 transition-colors"
        >
          Override Anyway
        </button>
      </div>
    </div>
  )
}
