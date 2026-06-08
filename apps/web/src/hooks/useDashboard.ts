'use client'

import * as React from 'react'
import type { DashboardTodayData } from '@/app/api/v1/dashboard/today/route'

export function useDashboard(initial: DashboardTodayData) {
  const [data, setData] = React.useState<DashboardTodayData>(initial)
  const [loading, setLoading] = React.useState(false)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/dashboard/today')
      if (res.ok) {
        const json = await res.json() as DashboardTodayData
        setData(json)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, refresh }
}
