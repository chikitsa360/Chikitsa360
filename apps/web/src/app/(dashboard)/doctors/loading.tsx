// Skeleton shown while the doctors RSC is fetching data
export default function DoctorsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading doctors">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="h-7 w-24 animate-pulse rounded bg-muted" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Doctor cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 animate-pulse rounded-full bg-muted shrink-0" />
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3.5 w-full animate-pulse rounded bg-muted" />
              <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
