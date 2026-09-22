import { describe, expect, it } from 'vitest'
import { toCsv } from './export'

describe('toCsv', () => {
  it('returns an empty string for no rows', () => {
    expect(toCsv([])).toBe('')
  })

  it('writes a header row from the union of all keys, then one row per entry', () => {
    const csv = toCsv([
      { name: 'Meditar', streak: 5 },
      { name: 'Leer', streak: 12 },
    ])
    expect(csv).toBe('name,streak\r\nMeditar,5\r\nLeer,12')
  })

  it('quotes a field containing a comma', () => {
    expect(toCsv([{ note: 'a, b' }])).toBe('note\r\n"a, b"')
  })

  it('quotes a field containing a double quote and doubles it', () => {
    expect(toCsv([{ note: 'she said "hi"' }])).toBe('note\r\n"she said ""hi"""')
  })

  it('quotes a field containing a newline', () => {
    expect(toCsv([{ note: 'line1\nline2' }])).toBe('note\r\n"line1\nline2"')
  })

  it('renders null/undefined as an empty field', () => {
    expect(toCsv([{ a: null, b: undefined }])).toBe('a,b\r\n,')
  })

  it('unions columns across rows with different shapes instead of dropping extra fields', () => {
    const csv = toCsv([{ a: 1 }, { a: 2, b: 3 }])
    expect(csv).toBe('a,b\r\n1,\r\n2,3')
  })
})
