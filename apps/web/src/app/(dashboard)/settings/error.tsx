'use client'

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
        <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4m0 4h.01" />
        </svg>
      </div>
      <h2 className="text-[16px] font-semibold text-foreground">Something went wrong</h2>
      <p className="mt-1 text-[13px] text-muted-foreground max-w-xs">
        {error.message || 'Failed to load this settings page. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="mt-4 h-9 px-4 rounded-lg bg-primary text-white text-[13px] font-semibold hover:bg-primary/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  )
}
