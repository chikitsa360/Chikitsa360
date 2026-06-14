// Skeleton shown while the events RSC is fetching data
export default function EventsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading events">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-1.5 h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Event cards */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 animate-pulse rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-56 animate-pulse rounded bg-muted" />
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="flex gap-2 mt-1">
                  <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
                  <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
                </div>
              </div>
              <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
