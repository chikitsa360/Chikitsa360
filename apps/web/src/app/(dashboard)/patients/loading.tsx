// Skeleton shown while the patients RSC is fetching data
export default function PatientsLoading() {
  return (
    <div aria-busy="true" aria-label="Loading patients">
      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="flex-1" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-4 border-b border-border bg-muted/50 px-5 py-2.5">
          <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
          <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
          <div className="ml-auto h-3.5 w-20 animate-pulse rounded bg-muted" />
        </div>

        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-3.5 last:border-0">
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-36 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
