import type { Metadata } from 'next'
import { brand, brandCssVars } from '@/lib/brand'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: brand.meta.appName,
    template: `%s | ${brand.meta.appName}`,
  },
  description: brand.meta.tagline,
  icons: {
    icon: brand.assets.faviconUrl,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Inject client-specific CSS variables for theming */}
        <style dangerouslySetInnerHTML={{ __html: brandCssVars }} />
      </head>
      <body className="bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
