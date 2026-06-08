import { describe, it, expect } from 'vitest'
import { detectKeyword } from '../keyword-detector'

describe('detectKeyword', () => {
  it('detects CANCEL (exact uppercase)', () => {
    expect(detectKeyword('CANCEL')).toBe('CANCEL')
  })

  it('detects CANCEL case-insensitively', () => {
    expect(detectKeyword('cancel')).toBe('CANCEL')
    expect(detectKeyword('Cancel')).toBe('CANCEL')
    expect(detectKeyword('cAnCeL')).toBe('CANCEL')
  })

  it('detects STOP', () => {
    expect(detectKeyword('STOP')).toBe('STOP')
    expect(detectKeyword('stop')).toBe('STOP')
  })

  it('detects START', () => {
    expect(detectKeyword('START')).toBe('START')
    expect(detectKeyword('start')).toBe('START')
  })

  it('ignores leading/trailing whitespace', () => {
    expect(detectKeyword('  CANCEL  ')).toBe('CANCEL')
    expect(detectKeyword('\tSTOP\n')).toBe('STOP')
  })

  it('returns null for regular messages', () => {
    expect(detectKeyword('Hi')).toBeNull()
    expect(detectKeyword('Book appointment')).toBeNull()
    expect(detectKeyword('Please cancel my appointment')).toBeNull()
    expect(detectKeyword('')).toBeNull()
  })

  it('does not match partial keywords', () => {
    expect(detectKeyword('CANCELLATION')).toBeNull()
    expect(detectKeyword('STOPPED')).toBeNull()
    expect(detectKeyword('RESTART')).toBeNull()
  })
})
