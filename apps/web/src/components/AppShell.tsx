'use client'

import { useState } from 'react'
import { SplashScreen } from './SplashScreen'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <>
      {!splashDone && <SplashScreen onComplete={() => setSplashDone(true)} />}
      <div
        style={{
          opacity: splashDone ? 1 : 0,
          transition: 'opacity 0.4s ease',
        }}
      >
        {children}
      </div>
    </>
  )
}
