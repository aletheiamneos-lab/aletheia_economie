import { describe, expect, it } from 'vitest'
import {
  DEMO_ADMISSION_TEST_ID,
  DEMO_GAME_ID,
  isDemoFlashcardDeck,
  isLockedForDemo,
} from './demoAccess'

describe('demo access rules', () => {
  it('opens the complete learning flow only for chapters 1 and 2', () => {
    for (const chapter of [1, 2]) {
      expect(isLockedForDemo({ page: 'lesson', chapter })).toBe(false)
      expect(isLockedForDemo({ page: 'assessment', chapter, mode: 'practice' })).toBe(false)
      expect(isLockedForDemo({ page: 'assessment', chapter, mode: 'final' })).toBe(false)
      expect(isLockedForDemo({ page: 'recap-assessment', chapter })).toBe(false)
      expect(isLockedForDemo({ page: 'graph-lab', lesson: chapter })).toBe(false)
    }

    expect(isLockedForDemo({ page: 'lesson', chapter: 3 })).toBe(true)
    expect(isLockedForDemo({ page: 'assessment', chapter: 19, mode: 'final' })).toBe(true)
    expect(isLockedForDemo({ page: 'recap-assessment', chapter: 3 })).toBe(true)
    expect(isLockedForDemo({ page: 'graph-lab', lesson: 3 })).toBe(true)
  })

  it('opens one game, one admission test and one flashcard deck', () => {
    expect(isLockedForDemo({ page: 'game', gameId: DEMO_GAME_ID })).toBe(false)
    expect(isLockedForDemo({ page: 'game', gameId: '02_consumer_lab' })).toBe(true)
    expect(isLockedForDemo({ page: 'admission-assessment', testId: DEMO_ADMISSION_TEST_ID })).toBe(false)
    expect(isLockedForDemo({ page: 'admission-assessment', testId: 'g2-23iulie2025' })).toBe(true)
    expect(isDemoFlashcardDeck('usor', 1)).toBe(true)
    expect(isDemoFlashcardDeck('usor', 2)).toBe(false)
    expect(isDemoFlashcardDeck('mediu', 1)).toBe(false)
  })

  it('keeps catalogues visible while protecting private sections', () => {
    expect(isLockedForDemo({ page: 'games' })).toBe(false)
    expect(isLockedForDemo({ page: 'flashcards' })).toBe(false)
    expect(isLockedForDemo({ page: 'admission-tests' })).toBe(false)
    expect(isLockedForDemo({ page: 'recap-tests' })).toBe(false)
    expect(isLockedForDemo({ page: 'library' })).toBe(true)
    expect(isLockedForDemo({ page: 'math-workspace' })).toBe(true)
    expect(isLockedForDemo({ page: 'admin-reports' })).toBe(true)
  })
})
