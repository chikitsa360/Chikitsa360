'use client'

import * as React from 'react'
import Link from 'next/link'
import { cn } from '@chikitsa360/core'
import { Avatar } from '@chikitsa360/ui'
import { useTranslations } from 'next-intl'
import { setLocale } from '@/lib/locale'
import { signOut } from 'next-auth/react'

type Theme = 'light' | 'dark' | 'high-contrast'

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'light') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', theme)
  }
  localStorage.setItem('theme-preference', theme)
}

interface UserMenuProps {
  userName?: string
  userRole?: string
  /** Custom trigger element. Defaults to an avatar button. */
  trigger?: React.ReactNode
  /** Extra classes applied to the trigger button (e.g. for full-width row layout). */
  triggerClassName?: string
  /** Whether the dropdown opens above the trigger (use when trigger is near the bottom of the screen). */
  dropUp?: boolean
}

export function UserMenu({ userName, userRole, trigger, triggerClassName, dropUp = false }: UserMenuProps) {
  const t = useTranslations()
  const [open, setOpen] = React.useState(false)
  const [theme, setTheme] = React.useState<Theme>('light')
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Restore theme preference on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('theme-preference') as Theme | null
    if (saved) {
      setTheme(saved)
      applyTheme(saved)
    }
  }, [])

  // Close on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close on Escape
  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  const handleThemeChange = (next: Theme) => {
    setTheme(next)
    applyTheme(next)
    setOpen(false)
  }

  const handleLocale = async (locale: string) => {
    await setLocale(locale)
    window.location.reload()
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-full',
          'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
          triggerClassName
        )}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="User menu"
      >
        {trigger ?? <Avatar name={userName ?? 'User'} size="sm" />}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 z-50',
            dropUp ? 'bottom-full mb-2' : 'top-full mt-2',
            'w-56 rounded-lg border border-border bg-background shadow-[var(--shadow-dropdown)]',
            'py-1'
          )}
        >
          {/* User info */}
          {userName && (
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
              {userRole && (
                <p className="text-xs text-muted-foreground capitalize">{userRole.toLowerCase()}</p>
              )}
            </div>
          )}

          {/* Settings / Profile */}
          <Link
            href="/settings/clinic"
            onClick={() => setOpen(false)}
            className="flex w-full items-center px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
          >
            {t('user-menu.profile')}
          </Link>

          {/* Language */}
          <div className="px-3 py-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              {t('language.label')}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => handleLocale('en')}
                className="flex-1 rounded px-2 py-1 text-xs font-medium border border-border hover:bg-muted transition-colors"
              >
                {t('language.en')}
              </button>
              <button
                onClick={() => handleLocale('hi')}
                className="flex-1 rounded px-2 py-1 text-xs font-medium border border-border hover:bg-muted transition-colors"
              >
                {t('language.hi')}
              </button>
            </div>
          </div>

          {/* Theme */}
          <div className="px-3 py-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Theme
            </p>
            <div className="flex gap-1">
              {(['light', 'dark', 'high-contrast'] as Theme[]).map((th) => (
                <button
                  key={th}
                  onClick={() => handleThemeChange(th)}
                  className={cn(
                    'flex-1 rounded px-1.5 py-1 text-xs font-medium border transition-colors',
                    theme === th
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:bg-muted'
                  )}
                >
                  {th === 'light' ? t('theme.light') : th === 'dark' ? t('theme.dark') : t('theme.high-contrast')}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border mt-1 pt-1">
            <button
              role="menuitem"
              onClick={handleLogout}
              className="flex w-full items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              {t('user-menu.logout')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

