import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/inngest', () => ({
  inngest: { send: vi.fn().mockResolvedValue(undefined) },
}))

import { scheduleReminders } from '../schedule-reminders'
import { inngest } from '@/lib/inngest'

const mockInngest = inngest as unknown as { send: ReturnType<typeof vi.fn> }

beforeEach(() => {
  vi.resetAllMocks()
  mockInngest.send.mockResolvedValue(undefined)
})

describe('scheduleReminders', () => {
  const APT_ID = 'apt-abc'
  const CLINIC_ID = 'clinic-1'

  it('enqueues both reminder jobs when slot is > 24h away', async () => {
    const future = new Date(Date.now() + 30 * 60 * 60 * 1000) // 30h from now
    await scheduleReminders(APT_ID, CLINIC_ID, future)

    expect(mockInngest.send).toHaveBeenCalledTimes(2)

    const calls = mockInngest.send.mock.calls.map((c) => c[0]) as Array<{ name: string; id: string }>
    expect(calls.find((c) => c.name === 'appointment/reminder-24h.send')?.id).toBe(`${APT_ID}:reminder-24h`)
    expect(calls.find((c) => c.name === 'appointment/reminder-2h.send')?.id).toBe(`${APT_ID}:reminder-2h`)
  })

  it('does NOT enqueue 24h job if slot is < 24h away (but > 2h away)', async () => {
    const soon = new Date(Date.now() + 10 * 60 * 60 * 1000) // 10h from now
    await scheduleReminders(APT_ID, CLINIC_ID, soon)

    expect(mockInngest.send).toHaveBeenCalledTimes(1)
    const call = mockInngest.send.mock.calls[0]?.[0] as { name: string }
    expect(call.name).toBe('appointment/reminder-2h.send')
  })

  it('does NOT enqueue 2h job if slot is < 2h away', async () => {
    const veryClose = new Date(Date.now() + 30 * 60 * 1000) // 30 min from now
    await scheduleReminders(APT_ID, CLINIC_ID, veryClose)

    expect(mockInngest.send).not.toHaveBeenCalled()
  })

  it('does NOT enqueue any jobs for sample appointments', async () => {
    const future = new Date(Date.now() + 30 * 60 * 60 * 1000)
    await scheduleReminders(APT_ID, CLINIC_ID, future, true) // isSample = true

    expect(mockInngest.send).not.toHaveBeenCalled()
  })

  it('includes clinicId in event data', async () => {
    const future = new Date(Date.now() + 30 * 60 * 60 * 1000)
    await scheduleReminders(APT_ID, CLINIC_ID, future)

    const calls = mockInngest.send.mock.calls.map((c) => c[0]) as Array<{ data: { clinicId: string } }>
    expect(calls[0]?.data.clinicId).toBe(CLINIC_ID)
    expect(calls[1]?.data.clinicId).toBe(CLINIC_ID)
  })
})
