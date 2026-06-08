import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
  },
}))

vi.mock('@/lib/whatsapp/message-sender', () => ({
  sendText: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@/lib/pusher', () => ({
  pusherServer: { trigger: vi.fn().mockResolvedValue(undefined) },
}))

vi.mock('@/lib/whatsapp/slot-availability', () => ({
  formatDayLabel: vi.fn().mockReturnValue('Mon, 9 Jun'),
  formatTimeLabel: vi.fn().mockReturnValue('3:30 PM'),
}))

import { handleReminderCancellation } from '../handle-reminder-cancellation'
import { db } from '@/lib/db'
import { sendText } from '@/lib/whatsapp/message-sender'
import { pusherServer } from '@/lib/pusher'

const mockDb = db as unknown as {
  $queryRawUnsafe: ReturnType<typeof vi.fn>
  $executeRawUnsafe: ReturnType<typeof vi.fn>
}
const mockSendText = sendText as unknown as ReturnType<typeof vi.fn>
const mockPusher = pusherServer as unknown as { trigger: ReturnType<typeof vi.fn> }

const CLINIC = {
  id: 'clinic-1',
  name: 'City Clinic',
  phoneNumberId: 'wa-phone-id',
  language: 'en' as const,
  clinicPhone: '1234567890',
  address: '12 Main St',
  trialEndsAt: null,
  whatsappConnected: true,
}

const APT = {
  id: 'apt-1',
  status: 'confirmed',
  slot_id: 'slot-1',
  appointment_date: '2026-06-10',
  token_number: 5,
  doctor_name: 'Dr. Sharma',
  start_time: '15:30',
  patient_phone: '9876543210',
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('handleReminderCancellation', () => {
  it('cancels appointment and sends acknowledgment on valid Quick Reply', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValue([APT])
    mockDb.$executeRawUnsafe.mockResolvedValue(undefined)

    await handleReminderCancellation(CLINIC, '9876543210', 'apt-1', 'en')

    // Appointment was cancelled
    expect(mockDb.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("status = 'cancelled'"),
      'apt-1'
    )
    // Slot was released
    expect(mockDb.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("status = 'available'"),
      'slot-1'
    )
    // cancelled_via set
    expect(mockDb.$executeRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining('whatsapp-reminder'),
      'apt-1'
    )
    // Pusher event triggered
    expect(mockPusher.trigger).toHaveBeenCalledWith('clinic-clinic-1', 'appointment.cancelled', expect.any(Object))
    // Acknowledgment sent
    expect(mockSendText).toHaveBeenCalledWith('wa-phone-id', '9876543210', expect.any(String))
  })

  it('sends cancelNotFound if appointment does not belong to this patient phone', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValue([{ ...APT, patient_phone: '1111111111' }])

    await handleReminderCancellation(CLINIC, '9876543210', 'apt-1', 'en')

    expect(mockDb.$executeRawUnsafe).not.toHaveBeenCalled()
    expect(mockSendText).toHaveBeenCalled()
    const msg = mockSendText.mock.calls[0]?.[2] as string
    // Should NOT be the ack message — it should be the "not found" message
    expect(msg).not.toContain('Sharma')
  })

  it('sends cancelNotFound if appointment not confirmed', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValue([{ ...APT, status: 'cancelled' }])

    await handleReminderCancellation(CLINIC, '9876543210', 'apt-1', 'en')

    expect(mockDb.$executeRawUnsafe).not.toHaveBeenCalled()
  })

  it('sends cancelNotFound if no appointment found', async () => {
    mockDb.$queryRawUnsafe.mockResolvedValue([])

    await handleReminderCancellation(CLINIC, '9876543210', 'apt-1', 'en')

    expect(mockDb.$executeRawUnsafe).not.toHaveBeenCalled()
    expect(mockSendText).toHaveBeenCalled()
  })
})
