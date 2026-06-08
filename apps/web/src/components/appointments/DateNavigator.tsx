'use client'

interface DateNavigatorProps {
  currentDate: string // YYYY-MM-DD
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  if (dateStr === todayStr) return 'Today'
  return dt.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function DateNavigator({ currentDate, onPrev, onNext, onToday }: DateNavigatorProps) {
  const label = formatDateLabel(currentDate)
  const isToday = label === 'Today'

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrev}
        aria-label="Previous day"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <button
        onClick={onToday}
        disabled={isToday}
        className="h-8 px-3 rounded-lg border border-border bg-card text-[12px] font-medium text-foreground disabled:opacity-50 hover:bg-muted transition-colors"
      >
        Today
      </button>

      <span className="text-[14px] font-semibold text-foreground min-w-[180px]">
        {label}
      </span>

      <button
        onClick={onNext}
        aria-label="Next day"
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  )
}
