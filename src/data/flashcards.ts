export type FlashcardDifficulty = 'usor' | 'mediu' | 'greu' | 'foarte_greu'

export interface FlashcardQuestion {
  numar_in_slot: number
  enunt: string
  variante: Record<'a' | 'b' | 'c' | 'd' | 'e', string>
  raspuns_corect: 'a' | 'b' | 'c' | 'd' | 'e'
  rezolvare: string
}

export interface FlashcardDeck {
  nivel: FlashcardDifficulty
  slot: number
  numar_intrebari: number
  intrebari: FlashcardQuestion[]
}

export const flashcardDifficulties: Array<{
  id: FlashcardDifficulty
  label: string
  shortLabel: string
}> = [
  { id: 'usor', label: 'Ușor', shortLabel: 'Ușor' },
  { id: 'mediu', label: 'Mediu', shortLabel: 'Mediu' },
  { id: 'greu', label: 'Greu', shortLabel: 'Greu' },
  { id: 'foarte_greu', label: 'Foarte greu', shortLabel: 'Expert' },
]

const filePrefixes: Record<FlashcardDifficulty, string> = {
  usor: 'Nivel_Usor',
  mediu: 'Nivel_Mediu',
  greu: 'Nivel_Greu',
  foarte_greu: 'Nivel_FoarteGreu',
}

export async function loadFlashcardDeck(difficulty: FlashcardDifficulty, slot: number, signal?: AbortSignal) {
  const safeSlot = Math.min(30, Math.max(1, Math.trunc(slot)))
  const fileName = `${filePrefixes[difficulty]}_Slot_${String(safeSlot).padStart(2, '0')}.json`
  const response = await fetch(`/flashcards/${difficulty}/${fileName}`, { signal })
  if (!response.ok) throw new Error(`Setul nu a putut fi încărcat (${response.status}).`)
  const deck = await response.json() as FlashcardDeck
  if (!Array.isArray(deck.intrebari) || deck.intrebari.length !== 30) throw new Error('Setul de flashcarduri este incomplet.')
  return deck
}
