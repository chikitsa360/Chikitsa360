'use client'

import * as React from 'react'

interface BookingLinkCardProps {
  slug: string
}

/**
 * Displays the clinic's booking URL with copy, WhatsApp share, and QR download actions.
 * Shown in Settings → Clinic Profile.
 */
export function BookingLinkCard({ slug }: BookingLinkCardProps) {
  const bookingUrl = `https://cliniqly.com/book/${slug}`
  const [copied, setCopied] = React.useState(false)
  const [downloadingQr, setDownloadingQr] = React.useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(bookingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select the text
    }
  }

  function handleWhatsAppShare() {
    const text = encodeURIComponent(`Book an appointment at our clinic: ${bookingUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer')
  }

  async function handleDownloadQr() {
    setDownloadingQr(true)
    try {
      const res = await fetch('/api/v1/clinics/qr-code')
      if (!res.ok) throw new Error('Failed to generate QR code')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}-booking-qr.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // Silent fail — user can retry
    } finally {
      setDownloadingQr(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center border-b border-border px-5 py-3.5">
        <h2 className="text-[14px] font-bold text-foreground">Online Booking Link</h2>
        <span className="ml-2 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">Live</span>
      </div>
      <div className="p-5">
        <p className="mb-3 text-[12px] text-muted-foreground">
          Share this link on Instagram, WhatsApp, or Google Business Profile so patients can book appointments directly.
        </p>

        {/* URL display */}
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
          <code className="flex-1 truncate text-[13px] font-mono text-foreground">{bookingUrl}</code>
          <button
            onClick={handleCopy}
            className="flex h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {copied ? (
              <>
                <svg className="h-3 w-3 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleWhatsAppShare}
            className="flex h-9 items-center gap-2 rounded-lg border border-[#25D366] bg-[#25D366]/5 px-4 text-[13px] font-semibold text-[#128C7E] transition-colors hover:bg-[#25D366]/10"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#25D366]" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Share on WhatsApp
          </button>

          <button
            onClick={handleDownloadQr}
            disabled={downloadingQr}
            className="flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-4 text-[13px] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {downloadingQr ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download QR Code
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
