import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../meta-whatsapp', () => ({
  sendTemplateMessage: vi.fn(),
}))

import { sendTemplateMessage } from '../meta-whatsapp'
import { sendLoginOtp } from '../otp-delivery'

const mockSendTemplate = sendTemplateMessage as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetAllMocks()
  global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

function stubWhatsAppEnv() {
  vi.stubEnv('OTP_WHATSAPP_PHONE_NUMBER_ID', '111222333444555')
  vi.stubEnv('META_SYSTEM_ACCESS_TOKEN', 'test-token')
}

function stubSmsEnv() {
  vi.stubEnv('MSG91_API_KEY', 'msg91-key')
  vi.stubEnv('MSG91_TEMPLATE_ID', 'tmpl-1')
}

describe('sendLoginOtp', () => {
  it('logs and returns dev channel when nothing is configured', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const channel = await sendLoginOtp('9876543210', '123456')
    expect(channel).toBe('dev')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('123456'))
    expect(mockSendTemplate).not.toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('sends via WhatsApp auth template when configured', async () => {
    stubWhatsAppEnv()
    mockSendTemplate.mockResolvedValue({ success: true, messageId: 'wamid.1' })

    const channel = await sendLoginOtp('9876543210', '654321')

    expect(channel).toBe('whatsapp')
    expect(mockSendTemplate).toHaveBeenCalledWith(
      '111222333444555',
      '919876543210',
      'login_otp',
      'en',
      [
        { type: 'body', parameters: [{ type: 'text', text: '654321' }] },
        {
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: '654321' }],
        },
      ],
      'test-token'
    )
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('respects template name/language overrides', async () => {
    stubWhatsAppEnv()
    vi.stubEnv('OTP_WHATSAPP_TEMPLATE', 'clinic_login_code')
    vi.stubEnv('OTP_WHATSAPP_TEMPLATE_LANG', 'hi')
    mockSendTemplate.mockResolvedValue({ success: true })

    await sendLoginOtp('9876543210', '111111')

    expect(mockSendTemplate).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'clinic_login_code',
      'hi',
      expect.any(Array),
      expect.any(String)
    )
  })

  it('falls back to MSG91 SMS when the WhatsApp send fails', async () => {
    stubWhatsAppEnv()
    stubSmsEnv()
    mockSendTemplate.mockResolvedValue({ success: false, error: 'template paused' })

    const channel = await sendLoginOtp('9876543210', '222333')

    expect(channel).toBe('sms')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.msg91.com/api/v5/otp',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ authkey: 'msg91-key' }),
        body: JSON.stringify({ template_id: 'tmpl-1', mobile: '919876543210', otp: '222333' }),
      })
    )
  })

  it('uses SMS directly when only MSG91 is configured', async () => {
    stubSmsEnv()
    const channel = await sendLoginOtp('9876543210', '444555')
    expect(channel).toBe('sms')
    expect(mockSendTemplate).not.toHaveBeenCalled()
  })

  it('throws when every configured channel fails', async () => {
    stubWhatsAppEnv()
    stubSmsEnv()
    mockSendTemplate.mockResolvedValue({ success: false, error: 'boom' })
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 })

    await expect(sendLoginOtp('9876543210', '999000')).rejects.toThrow(
      'All configured OTP channels failed'
    )
  })
})
