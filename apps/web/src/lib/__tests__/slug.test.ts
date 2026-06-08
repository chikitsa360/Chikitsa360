import { describe, it, expect } from 'vitest'
import { generateSlug, suggestSlug } from '../slug'

describe('generateSlug', () => {
  it('converts to lowercase', () => {
    expect(generateSlug('ABC Clinic')).toBe('abc-clinic')
  })

  it('replaces spaces with hyphens', () => {
    expect(generateSlug('my clinic name')).toBe('my-clinic-name')
  })

  it('strips special characters', () => {
    expect(generateSlug('ABC & Dental! Clinic')).toBe('abc-dental-clinic')
  })

  it('collapses multiple spaces/hyphens', () => {
    expect(generateSlug('ABC  Dental   Clinic')).toBe('abc-dental-clinic')
  })

  it('handles underscores', () => {
    expect(generateSlug('abc_dental_clinic')).toBe('abc-dental-clinic')
  })

  it('strips Devanagari characters', () => {
    expect(generateSlug('ABC डेंटल Clinic')).toBe('abc-clinic')
  })

  it('strips accented characters', () => {
    expect(generateSlug('Café Clinic')).toBe('cafe-clinic')
  })

  it('trims leading and trailing hyphens', () => {
    expect(generateSlug('  ---Clinic---  ')).toBe('clinic')
  })

  it('handles all-special-chars gracefully', () => {
    expect(generateSlug('!!! ###')).toBe('')
  })

  it('example from story: ABC Dental Clinic', () => {
    expect(generateSlug('ABC Dental Clinic')).toBe('abc-dental-clinic')
  })

  it('handles numbers', () => {
    expect(generateSlug('Clinic 24x7')).toBe('clinic-24x7')
  })

  it('strips parentheses', () => {
    expect(generateSlug('City (Multi) Care')).toBe('city-multi-care')
  })
})

describe('suggestSlug', () => {
  it('appends numeric suffix', () => {
    expect(suggestSlug('abc-clinic', 2)).toBe('abc-clinic-2')
  })

  it('appends higher suffix', () => {
    expect(suggestSlug('abc-clinic', 10)).toBe('abc-clinic-10')
  })
})
