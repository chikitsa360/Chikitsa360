import { describe, it, expect } from 'vitest'
import { generateQrCodePng } from '../qr-code'

describe('generateQrCodePng', () => {
  it('generates a PNG buffer for a valid URL', async () => {
    const url = 'https://cliniqly.com/book/test-clinic'
    const buffer = await generateQrCodePng(url)

    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    expect(buffer[0]).toBe(0x89)
    expect(buffer[1]).toBe(0x50) // P
    expect(buffer[2]).toBe(0x4e) // N
    expect(buffer[3]).toBe(0x47) // G
  })

  it('generates non-empty buffer', async () => {
    const buffer = await generateQrCodePng('https://cliniqly.com/book/rao-clinic')
    expect(buffer.length).toBeGreaterThan(100)
  })

  it('encodes the correct slug in URL', async () => {
    // Two different slugs should produce different QR codes
    const buf1 = await generateQrCodePng('https://cliniqly.com/book/clinic-a')
    const buf2 = await generateQrCodePng('https://cliniqly.com/book/clinic-b')
    expect(buf1.equals(buf2)).toBe(false)
  })
})
