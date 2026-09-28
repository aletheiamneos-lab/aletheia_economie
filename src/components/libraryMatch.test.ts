import { describe, expect, it } from 'vitest'
import manifest from '../../public/library/manifest.json'
import { matchLibraryResource } from './LibraryPage'

const resources = manifest.resources as Parameters<typeof matchLibraryResource>[1]

describe('matchLibraryResource', () => {
  it('recunoaște capitolele după numele obișnuite de pe calculator', () => {
    const names: Array<[string, string]> = [
      ['Capitolul 1 - Introducere in Economime.pdf', 'capitol-01.pdf'],
      ['Capitolul 4 - Factorii de producþie.pdf', 'capitol-04.pdf'],
      ['Capitolul 9 -  Concurenþa.pdf', 'capitol-09.pdf'],
      ['Capitolul 10 - Banii. Piata monetară.pdf', 'capitol-10.pdf'],
      ['Capitolul 16 - Crestere si dezvoltare economică. Ciclicitatea în economie.pdf', 'capitol-16.pdf'],
      ['Capitolul 19 - Integrare economică si globalizare.pdf', 'capitol-19.pdf'],
      ['capitol-06.pdf', 'capitol-06.pdf'],
    ]
    for (const [name, expected] of names) expect(matchLibraryResource(name, resources)?.fileName).toBe(expected)
  })

  it('recunoaște manualele după cuvinte-cheie și refuză ce nu recunoaște', () => {
    expect(matchLibraryResource('Economie 2012_Florina Pana_Corint.pdf', resources)?.fileName).toBe('manual-economie-corint-2012.pdf')
    expect(matchLibraryResource('Breviar complet de formule.pdf', resources)?.fileName).toBe('breviar-complet-formule.pdf')
    expect(matchLibraryResource('Manual Lăcătuș XI.pdf', resources)?.fileName).toBe('manual-alternativ-4.pdf')
    expect(matchLibraryResource('poza vacanta.pdf', resources)).toBeNull()
  })
})
