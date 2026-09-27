import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * AES-256-GCM encryption for Notify credentials stored on the Clinic row
 * (nsk_ API key, webhook signing secret). Key comes from NOTIFY_CREDS_KEY —
 * 32 bytes, hex-encoded (64 hex chars). Generate with:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Stored format: v1:<iv b64>:<auth tag b64>:<ciphertext b64>
 */

function credsKey(): Buffer {
  // Read inside the function (not module level) — testable with vi.stubEnv
  const hex = process.env.NOTIFY_CREDS_KEY ?? ''
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('NOTIFY_CREDS_KEY must be 64 hex chars (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

export function encryptNotifySecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', credsKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decryptNotifySecret(stored: string): string {
  const parts = stored.split(':')
  const version = parts[0] ?? ''
  const ivB64 = parts[1] ?? ''
  const tagB64 = parts[2] ?? ''
  const dataB64 = parts[3] ?? ''
  if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Malformed encrypted Notify secret')
  }
  const decipher = createDecipheriv('aes-256-gcm', credsKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
