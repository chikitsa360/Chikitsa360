import { brand } from '@/lib/brand'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <div className="mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.assets.logoUrl}
            alt={brand.assets.logoAlt}
            className="mx-auto h-16 w-auto"
          />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Welcome to {brand.meta.appName}
        </h1>
        {brand.meta.tagline && (
          <p className="text-lg text-muted-foreground mb-8">
            {brand.meta.tagline}
          </p>
        )}
        <div className="flex gap-4 justify-center">
          <a
            href="/dashboard"
            className="px-6 py-3 rounded-[--radius] bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Go to Dashboard
          </a>
          <a
            href={`mailto:${brand.meta.supportEmail}`}
            className="px-6 py-3 rounded-[--radius] border border-border text-foreground font-medium hover:bg-muted transition-colors"
          >
            Get Support
          </a>
        </div>
      </div>
    </main>
  )
}
