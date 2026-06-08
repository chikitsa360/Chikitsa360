import QRCode from 'qrcode'

/**
 * Generates a QR code PNG buffer for the given URL.
 * Uses high error correction (H) so it survives printing degradation.
 */
export async function generateQrCodePng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: 'H',
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  })
}
