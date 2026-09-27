import type { CategoryId, ChapterMeta } from '../types'

export const categoryInfo: Record<CategoryId, { label: string; kicker: string; color: string }> = {
  fundamente: { label: 'Fundamente', kicker: 'Cum gândim economic', color: '#ed704b' },
  micro: { label: 'Microeconomie', kicker: 'Decizii, firme și piețe', color: '#187f76' },
  piete: { label: 'Piețe specializate', kicker: 'Bani, capital și muncă', color: '#b68725' },
  macro: { label: 'Macroeconomie', kicker: 'Economia în ansamblu', color: '#6762a6' },
  stat: { label: 'Statul și lumea', kicker: 'Politici și relații globale', color: '#b55471' },
}

const chapterCatalog: ChapterMeta[] = [
  { number: 1, slug: 'introducere-in-economie', title: 'Introducere în economie', shortTitle: 'Introducere în economie', category: 'fundamente', duration: 42, available: true },
  { number: 2, slug: 'economia-de-piata-si-proprietatea', title: 'Economia de piață și proprietatea', shortTitle: 'Piața și proprietatea', category: 'fundamente', duration: 48, available: false },
  { number: 3, slug: 'utilitatea-bunurilor-economice', title: 'Utilitatea bunurilor economice și consumatorul rațional', shortTitle: 'Consumatorul rațional', category: 'micro', duration: 55, available: false },
  { number: 4, slug: 'factorii-de-productie', title: 'Factorii de producție', shortTitle: 'Factorii de producție', category: 'micro', duration: 50, available: false },
  { number: 5, slug: 'eficienta-si-productivitatea', title: 'Eficiența economică și productivitatea', shortTitle: 'Productivitatea', category: 'micro', duration: 46, available: false },
  { number: 6, slug: 'costul-productiei', title: 'Costul producției', shortTitle: 'Costul producției', category: 'micro', duration: 49, available: false },
  { number: 7, slug: 'profitul-si-renta', title: 'Profitul și renta', shortTitle: 'Profitul și renta', category: 'micro', duration: 48, available: false },
  { number: 8, slug: 'piata-si-echilibrul-sau', title: 'Piața și echilibrul său', shortTitle: 'Piața și echilibrul', category: 'micro', duration: 64, available: false },
  { number: 9, slug: 'mecanismul-concurential', title: 'Mecanismul concurențial', shortTitle: 'Concurența', category: 'micro', duration: 44, available: false },
  { number: 10, slug: 'banii-piata-monetara', title: 'Banii. Piața monetară', shortTitle: 'Banii și piața monetară', category: 'piete', duration: 50, available: false },
  { number: 11, slug: 'inflatia', title: 'Inflația', shortTitle: 'Inflația', category: 'piete', duration: 42, available: false },
  { number: 12, slug: 'piata-de-capital', title: 'Piața de capital (financiară)', shortTitle: 'Piața de capital', category: 'piete', duration: 48, available: false },
  { number: 13, slug: 'piata-muncii', title: 'Piața muncii. Salariul', shortTitle: 'Piața muncii', category: 'piete', duration: 46, available: false },
  { number: 14, slug: 'somajul', title: 'Șomajul', shortTitle: 'Șomajul', category: 'piete', duration: 42, available: false },
  { number: 15, slug: 'venitul-consumul-investitiile', title: 'Venitul, consumul și investițiile', shortTitle: 'Venit și investiții', category: 'macro', duration: 45, available: false },
  { number: 16, slug: 'crestere-dezvoltare-economica', title: 'Creștere și dezvoltare economică. Ciclicitatea în economie', shortTitle: 'Creștere și dezvoltare', category: 'macro', duration: 47, available: false },
  { number: 17, slug: 'ciclicitatea-economica', title: 'Ciclicitatea economică', shortTitle: 'Ciclicitatea economică', category: 'macro', duration: 40, available: false },
  { number: 18, slug: 'statul-in-economia-de-piata', title: 'Statul în economia de piață', shortTitle: 'Statul în economie', category: 'stat', duration: 43, available: false },
  { number: 19, slug: 'piata-mondiala', title: 'Piața mondială', shortTitle: 'Piața mondială', category: 'stat', duration: 46, available: false },
]

export const chapters: ChapterMeta[] = chapterCatalog.map((chapter) => ({ ...chapter, available: true }))

export const categories = (Object.keys(categoryInfo) as CategoryId[]).map((id) => ({
  id,
  ...categoryInfo[id],
  chapters: chapters.filter((chapter) => chapter.category === id),
}))
