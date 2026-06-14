// Skeleton shown while the dashboard RSC is fetching data
export default function DashboardLoading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      {/* Greeting skeleton */}
      <div className="mb-5">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
      </div>

      {/* Toggle row */}
      <div className="mb-5 flex justify-end">
        <div className="h-8 w-36 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Stat cards — 4 col */}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="h-8 w-14 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Revenue + patients row */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="h-4 w-16 animate-pulse rounded bg-muted mb-3" />
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        </div>
        <div className="lg:col-span-3 flex items-center rounded-xl border border-border bg-card px-5 py-4 gap-3">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-muted" />
        </div>
      </div>

      {/* Upcoming feed */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
        <ul>
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-36 animate-pulse rounded bg-muted" />
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-6 w-14 animate-pulse rounded-full bg-muted" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
