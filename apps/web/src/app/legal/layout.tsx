import Link from 'next/link'
import { brand } from '@/lib/brand'

/**
 * Public legal pages (/legal/terms, /legal/privacy, /legal/dpa).
 * Opened in a new tab from onboarding step 1 — no auth, no sidebar.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link href="/" className="text-[15px] font-bold text-primary">
            {brand.meta.appName}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <article
          className="text-[14px] leading-relaxed text-foreground
            [&_h1]:text-[24px] [&_h1]:font-bold [&_h1]:tracking-tight
            [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-[17px] [&_h2]:font-semibold
            [&_p]:mb-3 [&_p]:text-muted-foreground
            [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-1 [&_li]:text-muted-foreground
            [&_strong]:text-foreground"
        >
          {children}
        </article>
        <footer className="mt-12 border-t border-border pt-6 text-[12px] text-muted-foreground">
          Questions about these terms? Contact{' '}
          <a href={`mailto:${brand.meta.supportEmail}`} className="text-primary hover:underline">
            {brand.meta.supportEmail}
          </a>
        </footer>
      </main>
    </div>
  )
}
