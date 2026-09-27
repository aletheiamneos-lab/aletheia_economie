/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionApi } from '../session'
import type { NormalizedQuestion } from '../types'
import { AssessmentPage } from './AssessmentPage'

const questions: NormalizedQuestion[] = [
  {
    id: 'q1', source: 'final', kind: 'teorie', prompt: 'Prima întrebare?',
    options: [{ id: 'a', text: 'Varianta A' }, { id: 'b', text: 'Varianta B' }],
    correctOptionId: 'a', explanation: 'Explicația primei întrebări.',
  },
  {
    id: 'q2', source: 'final', kind: 'exercitiu', prompt: 'A doua întrebare?',
    options: [{ id: 'a', text: 'Varianta A2' }, { id: 'b', text: 'Varianta B2' }],
    correctOptionId: 'b', explanation: 'Explicația celei de-a doua întrebări.',
  },
]

function sessionStub() {
  return { session: { completedRecapTests: [] }, toggleRecapCompletion: vi.fn() } as unknown as SessionApi
}

describe('assessment experience', () => {
  beforeEach(() => { window.scrollTo = vi.fn() })
  afterEach(cleanup)

  it('keeps final answers private until submission and saves the result', () => {
    const sessionApi = sessionStub()
    render(<AssessmentPage chapterNumber={1} chapterTitle="Introducere în economie" mode="final" questions={questions} sessionApi={sessionApi} onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /începe testul/i }))
    fireEvent.click(screen.getByRole('button', { name: /varianta a$/i }))
    expect(screen.queryByText('Explicația primei întrebări.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /următoarea/i }))
    fireEvent.click(screen.getByRole('button', { name: /varianta b2/i }))
    fireEvent.click(screen.getByRole('button', { name: /finalizează/i }))
    fireEvent.click(screen.getByRole('button', { name: /trimite acum/i }))
    expect(screen.getByText('Foarte bine — fundația e solidă.')).toBeInTheDocument()
    expect(screen.getByText('Explicația celei de-a doua întrebări.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /raportul complet, trimis direct elevului/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /descarcă raportul/i })).toBeInTheDocument()
  })

  it('shows immediate explanations in practice mode', () => {
    render(<AssessmentPage chapterNumber={1} chapterTitle="Introducere în economie" mode="practice" questions={[{ ...questions[0], source: 'practice' }]} sessionApi={sessionStub()} onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /începe sesiunea/i }))
    fireEvent.click(screen.getByRole('button', { name: /varianta a$/i }))
    expect(screen.getByText('Ai răspuns corect.')).toBeInTheDocument()
    expect(screen.getByText('Explicația primei întrebări.')).toBeInTheDocument()
  })

  it('reveals recap answers and original explanations only after submission', () => {
    const sessionApi = sessionStub()
    render(<AssessmentPage chapterNumber={3} chapterTitle="Utilitatea bunurilor economice" mode="recap" questions={[{ ...questions[0], source: 'practice' }]} sessionApi={sessionApi} onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /începe testul/i }))
    fireEvent.click(screen.getByRole('button', { name: /varianta b$/i }))
    expect(screen.queryByText('Explicația primei întrebări.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /finalizează/i }))
    fireEvent.click(screen.getByRole('button', { name: /trimite acum/i }))
    expect(screen.getByText('Răspuns greșit')).toBeInTheDocument()
    expect(screen.getByText('Explicația primei întrebări.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /marchează parcurs/i }))
    expect(sessionApi.toggleRecapCompletion).toHaveBeenCalledWith(3)
  })

  it('does not allow a recap test to skip unanswered questions', () => {
    const sessionApi = sessionStub()
    render(<AssessmentPage chapterNumber={4} chapterTitle="Factorii de producție" mode="recap" questions={questions.map((question) => ({ ...question, source: 'practice' }))} sessionApi={sessionApi} onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /începe testul/i }))
    fireEvent.click(screen.getByRole('button', { name: /varianta a$/i }))
    fireEvent.click(screen.getByRole('button', { name: /următoarea/i }))
    fireEvent.click(screen.getByRole('button', { name: /finalizează/i }))
    expect(screen.queryByRole('button', { name: /trimite acum/i })).not.toBeInTheDocument()
    expect(screen.getByText(/poate fi trimis numai după completarea tuturor/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /continuă cu prima întrebare lipsă/i })).toBeInTheDocument()
    expect(sessionApi.toggleRecapCompletion).not.toHaveBeenCalled()
  })

  it('keeps admission solutions and formulas hidden until the test is submitted', () => {
    const admissionQuestion: NormalizedQuestion = {
      ...questions[1],
      id: 'admission-test-q51',
      source: 'admission',
      originalNumber: 51,
      formula: 'CA = CT / Q',
    }
    render(
      <AssessmentPage
        chapterNumber={2025}
        chapterTitle="23 iulie 2025 · G1"
        mode="admission"
        questions={[admissionQuestion]}
        sessionApi={sessionStub()}
        onNavigate={vi.fn()}
        admissionContext={{
          variant: 'G1', session: '23 iulie 2025', economyRange: '51-80',
          subjectSource: 'subiect.pdf', answerSource: 'barem.pdf', note: null,
        }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /începe testul/i }))
    expect(screen.queryByText('CA = CT / Q')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /varianta b2/i }))
    fireEvent.click(screen.getByRole('button', { name: /finalizează/i }))
    fireEvent.click(screen.getByRole('button', { name: /trimite acum/i }))
    expect(screen.getByText('CA = CT / Q')).toBeInTheDocument()
    expect(screen.getByText('Explicația celei de-a doua întrebări.')).toBeInTheDocument()
    expect(screen.getByText('Întrebarea 51')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /raportul complet, trimis direct elevului/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /numele elevului/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /descarcă raportul/i })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: /e-mailul elevului/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /trimite pe e-mail/i })).toBeInTheDocument()
  })

  it('shows the email delivery action to the teacher role', () => {
    const adminSession = { session: { completedRecapTests: [], userRole: 'admin' }, toggleRecapCompletion: vi.fn() } as unknown as SessionApi
    render(
      <AssessmentPage
        chapterNumber={2025}
        chapterTitle="23 iulie 2025 · G1"
        mode="admission"
        questions={[{ ...questions[0], source: 'admission', originalNumber: 51 }]}
        sessionApi={adminSession}
        onNavigate={vi.fn()}
        admissionContext={{ variant: 'G1', session: '23 iulie 2025', economyRange: '51-80', subjectSource: 'subiect.pdf', answerSource: 'barem.pdf', note: null }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /începe testul/i }))
    fireEvent.click(screen.getByRole('button', { name: /varianta a$/i }))
    fireEvent.click(screen.getByRole('button', { name: /finalizează/i }))
    fireEvent.click(screen.getByRole('button', { name: /trimite acum/i }))

    expect(screen.getByRole('textbox', { name: /e-mailul elevului/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /trimite pe e-mail/i })).toBeInTheDocument()
  })
})
