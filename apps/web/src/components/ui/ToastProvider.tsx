'use client'

import * as React from 'react'
import { cn } from '@chikitsa360/core'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  variant: ToastVariant
  title?: string
  message: string
  duration?: number
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

const MAX_TOASTS = 3
const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  warning: 4000,
  error: 8000,
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'bg-background border-l-4 border-l-success',
  error: 'bg-background border-l-4 border-l-error',
  warning: 'bg-background border-l-4 border-l-warning',
  info: 'bg-background border-l-4 border-l-primary',
}

const variantIconColor: Record<ToastVariant, string> = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-primary',
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === 'success')
    return (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    )
  if (variant === 'error')
    return (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  if (variant === 'warning')
    return (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    )
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
    </svg>
  )
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = React.useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = crypto.randomUUID()
      const duration = toast.duration ?? DEFAULT_DURATION[toast.variant]
      setToasts((prev) => {
        const next = [...prev, { ...toast, id }]
        return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next
      })
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration)
      }
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Live region for screen readers */}
      <div aria-live="polite" aria-atomic="false" className="sr-only">
        {toasts.map((t) => (
          <span key={t.id}>{t.title ? `${t.title}: ` : ''}{t.message}</span>
        ))}
      </div>
      {/* Toast container */}
      <div
        className={cn(
          'fixed z-50 flex flex-col gap-2',
          'top-4 right-4 w-80 max-w-[calc(100vw-2rem)]',
          'sm:top-4 sm:right-4',
          'max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:right-auto max-sm:top-4'
        )}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className={cn(
              'flex items-start gap-3 rounded-lg border border-border p-4 shadow-[var(--shadow-dropdown)]',
              variantStyles[toast.variant],
              'animate-in slide-in-from-top-2 duration-200'
            )}
          >
            <span className={variantIconColor[toast.variant]}>
              <ToastIcon variant={toast.variant} />
            </span>
            <div className="flex-1 min-w-0">
              {toast.title && (
                <p className="text-sm font-semibold text-foreground">{toast.title}</p>
              )}
              <p className="text-sm text-muted-foreground">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss notification"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
