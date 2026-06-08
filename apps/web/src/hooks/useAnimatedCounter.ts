'use client'

import * as React from 'react'

/**
 * Returns an incrementing `animKey` whenever `value` changes.
 * Consumers apply a CSS slide-up animation triggered by the key change.
 * The animation only fires on live updates — not on initial load.
 */
export function useAnimatedCounter(value: number): { animKey: number } {
  const [animKey, setAnimKey] = React.useState(0)
  const prevValue = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (prevValue.current !== null && prevValue.current !== value) {
      setAnimKey((k) => k + 1)
    }
    prevValue.current = value
  }, [value])

  return { animKey }
}
