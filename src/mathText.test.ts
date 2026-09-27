import { describe, expect, it } from 'vitest'
import { mathDraftAsPlainText, parseMathScripts, parseMathText, replaceMathSymbols } from './mathText'

describe('math text helpers', () => {
  it('turns simple and grouped divisions into fraction tokens', () => {
    expect(parseMathText('1/2 + {venit total}/{4 elevi}')).toEqual([
      { type: 'fraction', numerator: '1', denominator: '2' },
      { type: 'text', value: ' + ' },
      { type: 'fraction', numerator: 'venit total', denominator: '4 elevi' },
    ])
  })

  it('keeps normal text and replaces friendly operator shortcuts', () => {
    expect(parseMathText('Cererea crește')).toEqual([{ type: 'text', value: 'Cererea crește' }])
    expect(replaceMathSymbols('3 * 4 -> 12')).toBe('3 × 4 → 12')
  })

  it('creates a readable plain-text export', () => {
    expect(mathDraftAsPlainText('Exemplu', '1/2')).toContain('Exemplu\n========\n\n1/2')
  })

  it('recognizes editable upper and lower indices', () => {
    expect(parseMathScripts('P_{0} × Q^{2}')).toEqual([
      { type: 'text', value: 'P' },
      { type: 'subscript', value: '0' },
      { type: 'text', value: ' × Q' },
      { type: 'superscript', value: '2' },
    ])
  })
})
