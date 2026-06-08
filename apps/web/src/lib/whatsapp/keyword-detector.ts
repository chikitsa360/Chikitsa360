/**
 * Detects special WhatsApp keywords from patient message text.
 * Case-insensitive, exact word match (CR-11, FR-6).
 */
export function detectKeyword(text: string): 'CANCEL' | 'STOP' | 'START' | null {
  const normalized = text.trim().toUpperCase()
  if (normalized === 'CANCEL') return 'CANCEL'
  if (normalized === 'STOP') return 'STOP'
  if (normalized === 'START') return 'START'
  return null
}
