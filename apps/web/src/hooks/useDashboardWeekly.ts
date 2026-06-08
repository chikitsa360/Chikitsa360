'use client'

import * as React from 'react'
import type { DashboardWeekData } from '@/app/api/v1/dashboard/week/route'

export function useDashboardWeekly() {
  const [data, setData] = React.useState<DashboardWeekData | null>(null)
  const [loading, setLoading] = React.useState(false)

  const fetch_ = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/dashboard/week')
      if (res.ok) {
        const json = await res.json() as DashboardWeekData
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const refresh = React.useCallback(async () => {
    if (data) await fetch_()
  }, [data, fetch_])

  return { data, loading, load: fetch_, refresh }
}
