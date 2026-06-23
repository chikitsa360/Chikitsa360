'use client'

import * as React from 'react'
import Image from 'next/image'

interface LogoUploadProps {
  /** Currently saved logo URL (from DB) */
  currentLogoUrl?: string | null
  /** Called when user picks a new file. Parent handles the upload. */
  onFileSelect: (file: File) => void
  /** Called when user removes the logo */
  onRemove: () => void
  /** Whether an upload is in progress */
  uploading?: boolean
  /** Error message to display */
  error?: string
}

export function LogoUpload({
  currentLogoUrl,
  onFileSelect,
  onRemove,
  uploading = false,
  error,
}: LogoUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [preview, setPreview] = React.useState<string | null>(currentLogoUrl ?? null)

  // Sync preview when external URL changes (e.g. settings page reload)
  React.useEffect(() => {
    setPreview(currentLogoUrl ?? null)
  }, [currentLogoUrl])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Local preview immediately
    setPreview(URL.createObjectURL(file))
    onFileSelect(file)
    // Reset so same file can be re-selected
    e.target.value = ''
  }

  function handleRemove(e: React.MouseEvent) {
    e.stopPropagation()
    setPreview(null)
    onRemove()
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {preview ? (
        /* ── Logo preview ─────────────────────────────────────── */
        <div className="relative inline-block">
          <div className="h-20 w-20 overflow-hidden rounded-xl border border-border bg-muted">
            <Image
              src={preview}
              alt="Clinic logo"
              width={80}
              height={80}
              className="h-full w-full object-contain p-1"
              unoptimized
            />
          </div>

          {/* Loading overlay */}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
              <svg className="h-5 w-5 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          )}

          {/* Remove button */}
          {!uploading && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-error hover:text-white hover:border-error"
              aria-label="Remove logo"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          {/* Change button */}
          {!uploading && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="mt-2 block w-full text-center text-[11px] font-medium text-primary hover:underline"
            >
              Change
            </button>
          )}
        </div>
      ) : (
        /* ── Upload placeholder ───────────────────────────────── */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-20 w-20 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border bg-muted text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-[10px] font-medium leading-tight text-center px-1">
            {uploading ? 'Uploading...' : 'Upload Logo'}
          </span>
        </button>
      )}

      {error && (
        <p className="mt-1.5 text-[12px] text-error">{error}</p>
      )}
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        JPG, PNG, WebP or SVG · Max 2 MB
      </p>
    </div>
  )
}
