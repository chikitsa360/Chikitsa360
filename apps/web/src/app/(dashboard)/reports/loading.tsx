// Skeleton shown while the reports RSC is fetching data
export default function ReportsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading reports">
      {/* Page header */}
      <div className="mb-6">
        <div className="h-7 w-36 animate-pulse rounded bg-muted" />
        <div className="mt-1.5 h-4 w-64 animate-pulse rounded bg-muted" />
      </div>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-28 animate-pulse rounded-md bg-muted" />
        ))}
      </div>

      {/* Filter row */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Chart area */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="h-5 w-40 animate-pulse rounded bg-muted mb-6" />
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  )
}
