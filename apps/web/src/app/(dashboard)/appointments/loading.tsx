// Skeleton shown while the appointments RSC is fetching data
export default function AppointmentsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading appointments">
      {/* Page header */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="flex items-center gap-2 ml-auto">
          <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-8 w-20 animate-pulse rounded-lg bg-muted" />
          <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>

      {/* Date navigator */}
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2">
        <div className="h-7 w-7 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted mx-auto" />
        <div className="h-7 w-7 animate-pulse rounded bg-muted" />
      </div>

      {/* Appointment cards */}
      <div className="mt-3 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
