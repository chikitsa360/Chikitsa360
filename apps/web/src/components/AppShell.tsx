'use client'

import { useState, useCallback } from 'react'
import { SplashScreen } from './SplashScreen'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [splashDone, setSplashDone] = useState(false)

  const handleSplashComplete = useCallback(() => setSplashDone(true), [])

  return (
    <>
      {!splashDone && <SplashScreen onComplete={handleSplashComplete} />}
      <div
        style={{
          opacity: splashDone ? 1 : 0,
          visibility: splashDone ? 'visible' : 'hidden',
          transition: 'opacity 0.4s ease',
        }}
      >
        {children}
      </div>
    </>
  )
}
