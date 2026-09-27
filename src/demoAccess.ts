import type { Route } from './types'

export const DEMO_CHAPTERS = [1, 2] as const
export const DEMO_GAME_ID = '01_market_maker'
export const DEMO_ADMISSION_TEST_ID = 'g1-23iulie2025'
export const DEMO_FLASHCARD_DIFFICULTY = 'usor'
export const DEMO_FLASHCARD_SLOT = 1

export function isDemoChapter(chapter: number) {
  return DEMO_CHAPTERS.includes(chapter as (typeof DEMO_CHAPTERS)[number])
}

export function isDemoFlashcardDeck(difficulty: string, slot: number) {
  return difficulty === DEMO_FLASHCARD_DIFFICULTY && slot === DEMO_FLASHCARD_SLOT
}

export function isLockedForDemo(route: Route) {
  if (route.page === 'library' || route.page === 'math-workspace' || route.page === 'admin-reports') return true
  if (route.page === 'lesson' || route.page === 'assessment' || route.page === 'recap-assessment') {
    return !isDemoChapter(route.chapter)
  }
  if (route.page === 'graph-lab') return Boolean(route.lesson && !isDemoChapter(route.lesson))
  if (route.page === 'game') return route.gameId !== DEMO_GAME_ID
  if (route.page === 'admission-assessment') return route.testId !== DEMO_ADMISSION_TEST_ID
  return false
}
