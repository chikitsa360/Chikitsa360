#!/usr/bin/env tsx
/**
 * check-translations.ts
 * Verifies that hi.json contains all keys present in en.json.
 * Run from the repo root: pnpm check-translations
 * Or from apps/web: pnpm check-translations (uses the app's messages/ dir)
 */

import { readFileSync } from 'fs'
import { join, resolve } from 'path'

// Determine messages directory: if run from repo root, go into apps/web/messages
// If run from apps/web, use messages directly
const cwd = process.cwd()
const messagesDir =
  cwd.endsWith('apps/web')
    ? join(cwd, 'messages')
    : join(cwd, 'apps', 'web', 'messages')

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, fullKey)
    }
    return [fullKey]
  })
}

function main(): void {
  const enRaw = readFileSync(join(messagesDir, 'en.json'), 'utf-8')
  const hiRaw = readFileSync(join(messagesDir, 'hi.json'), 'utf-8')

  const enKeys = new Set(flattenKeys(JSON.parse(enRaw)))
  const hiKeys = new Set(flattenKeys(JSON.parse(hiRaw)))

  const missing = [...enKeys].filter((k) => !hiKeys.has(k))

  if (missing.length > 0) {
    console.error(`\n❌ Missing ${missing.length} translation key(s) in hi.json:\n`)
    missing.forEach((k) => console.error(`  - ${k}`))
    console.error()
    process.exit(1)
  }

  console.log(`✅ All ${enKeys.size} translation keys are present in hi.json`)
}

main()
