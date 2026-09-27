/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SessionApi } from '../session'
import { AdmissionTestsPage } from './AdmissionTestsPage'
import { FlashcardsPage } from './FlashcardsPage'
import { LessonsPage } from './LessonsPage'
import { RecapTestsPage } from './RecapTestsPage'

function sessionStub() {
  return {
    session: { completedRecapTests: [], completedChapters: [], isDemo: true },
    getChapterState: () => ({ completed: false }),
    toggleRecapCompletion: vi.fn(),
  } as unknown as SessionApi
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
  window.sessionStorage.clear()
})

describe('Demo catalogues', () => {
  it('keeps all lessons visible and locks chapters 3–19', () => {
    const onNavigate = vi.fn()
    render(<LessonsPage sessionApi={sessionStub()} isDemo onNavigate={onNavigate} />)

    expect(document.querySelectorAll('.lesson-list-row')).toHaveLength(19)
    expect(document.querySelectorAll('.lesson-list-row.is-demo-locked')).toHaveLength(17)
    expect(screen.getAllByRole('button', { name: /teorie · demo/i })).toHaveLength(17)
    fireEvent.click(screen.getAllByRole('button', { name: /teorie · demo/i })[0])
    expect(onNavigate).toHaveBeenCalledWith('#/capitol/3')
  })

  it('keeps all recap tests visible and locks chapters 3–19', () => {
    const onNavigate = vi.fn()
    render(<RecapTestsPage sessionApi={sessionStub()} isDemo onNavigate={onNavigate} />)

    expect(document.querySelectorAll('.recap-test-card')).toHaveLength(19)
    expect(document.querySelectorAll('.recap-test-card.is-demo-locked')).toHaveLength(17)
    fireEvent.click(screen.getByRole('button', { name: 'Blocat în Demo: testul capitolului 3' }))
    expect(onNavigate).toHaveBeenCalledWith('#/teste-recapitulative/capitol/3')
  })

  it('opens only the first Easy flashcard deck and shows DemoLockPage for another deck', () => {
    render(<FlashcardsPage isDemo onDemoLogin={vi.fn()} />)

    expect(document.querySelectorAll('.flashcards-deck-tile')).toHaveLength(120)
    expect(document.querySelectorAll('.flashcards-deck-tile.is-demo-locked')).toHaveLength(119)
    fireEvent.click(screen.getByRole('button', { name: 'Blocat în Demo: Ușor, setul 02' }))
    expect(screen.getByRole('heading', { name: 'Disponibil cu cont de elev' })).toBeInTheDocument()
  })

  it('marks every admission test except 2025 G1 as locked', async () => {
    const manifest = {
      version: 1,
      testCount: 2,
      totalQuestions: 60,
      formulaQuestions: 0,
      yearRange: [2025, 2025],
      tests: [
        { id: 'g1-23iulie2025', year: 2025, session: '23 iulie 2025', variant: 'G1', filename: 'g1.json', questionCount: 30, economyRange: '51-80', difficultyCounts: { usor: 30 }, subjectSource: '', answerSource: '', note: null },
        { id: 'g2-23iulie2025', year: 2025, session: '23 iulie 2025', variant: 'G2', filename: 'g2.json', questionCount: 30, economyRange: '51-80', difficultyCounts: { usor: 30 }, subjectSource: '', answerSource: '', note: null },
      ],
    }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => manifest } as Response)))
    const onNavigate = vi.fn()
    render(<AdmissionTestsPage isDemo onNavigate={onNavigate} />)

    expect(await screen.findByRole('button', { name: 'Blocat în Demo: 23 iulie 2025 G2' })).toBeInTheDocument()
    expect(document.querySelectorAll('.admission-test-card')).toHaveLength(2)
    expect(document.querySelectorAll('.admission-test-card.is-demo-locked')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Blocat în Demo: 23 iulie 2025 G2' }))
    expect(onNavigate).toHaveBeenCalledWith('#/teste-admitere/g2-23iulie2025')
  })
})
