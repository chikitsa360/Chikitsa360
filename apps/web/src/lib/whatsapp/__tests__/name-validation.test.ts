import { describe, it, expect } from 'vitest'
import { validateName } from '../step-handlers/handle-name'

describe('validateName', () => {
  it('accepts standard Latin names', () => {
    expect(validateName('Rahul Kumar')).toBe(true)
    expect(validateName('Alice')).toBe(true)
    expect(validateName('Jean-Pierre')).toBe(true)
  })

  it('accepts Devanagari names', () => {
    expect(validateName('राहुल कुमार')).toBe(true)
    expect(validateName('सुनीता')).toBe(true)
  })

  it('accepts mixed Latin and Devanagari', () => {
    expect(validateName('Rahul राहुल')).toBe(true)
  })

  it('accepts accented Latin characters', () => {
    expect(validateName('Anirudh')).toBe(true)
    expect(validateName('Renée')).toBe(true)
  })

  it('rejects digits-only input', () => {
    expect(validateName('9876543210')).toBe(false)
    expect(validateName('123')).toBe(false)
  })

  it('rejects special-characters-only input', () => {
    expect(validateName('!!!!')).toBe(false)
    expect(validateName('###')).toBe(false)
    expect(validateName('...')).toBe(false)
  })

  it('rejects blank or whitespace-only input', () => {
    expect(validateName('')).toBe(false)
    expect(validateName('   ')).toBe(false)
    expect(validateName('\t\n')).toBe(false)
  })

  it('accepts name with digits if letters are also present', () => {
    // Edge case: "John2" — contains a letter, should pass
    expect(validateName('John2')).toBe(true)
  })
})
