/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { NormalizedQuestion } from './types'
import { admissionReportFilename, createAdmissionReportPdf, emailAdmissionReport, renderAssessmentReportPages, type AdmissionReportData } from './admissionReport'

const questions: NormalizedQuestion[] = [
  {
    id: 'q51', source: 'admission', kind: 'teorie', originalNumber: 51,
    prompt: 'Care este răspunsul corect?',
    options: [{ id: 'a', text: 'Prima variantă' }, { id: 'b', text: 'A doua variantă' }],
    correctOptionId: 'a', explanation: 'Prima variantă respectă definiția economică.',
  },
  {
    id: 'q52', source: 'admission', kind: 'exercitiu', originalNumber: 52,
    prompt: 'Calculează indicatorul economic.',
    options: [{ id: 'a', text: '10' }, { id: 'b', text: '20' }],
    correctOptionId: 'b', formula: 'CA = CT / Q', explanation: 'Se înlocuiesc valorile în formulă și se obține 20.',
  },
]

const data: AdmissionReportData = {
  studentName: 'Ștefan Ionescu',
  elapsedSeconds: 754,
  test: { year: 2025, session: '23 iulie 2025', variant: 'G1', economyRange: '51-80' },
  questions,
  answers: { q51: 'a', q52: 'a' },
  generatedAt: new Date('2026-09-13T12:00:00'),
}

describe('admission PDF report', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('creates a safe, descriptive filename', () => {
    expect(admissionReportFilename(data)).toBe('raport-admitere-2025-g1-ștefan-ionescu.pdf')
    expect(admissionReportFilename({
      ...data,
      test: {
        kind: 'chapter', year: 2026, session: 'Capitolul 3', variant: 'Test final',
        economyRange: 'Utilitatea bunurilor economice', chapterNumber: 3, chapterTitle: 'Utilitatea bunurilor economice',
      },
    })).toBe('raport-test-final-capitol-03-ștefan-ionescu.pdf')
  })

  it('builds a self-contained PDF containing the score chart and answer review pages', async () => {
    const gradient = { addColorStop: vi.fn() }
    const context = {
      fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: 'butt', font: '', textAlign: 'left',
      fillRect: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(), arcTo: vi.fn(), closePath: vi.fn(),
      fill: vi.fn(), stroke: vi.fn(), fillText: vi.fn(), createLinearGradient: vi.fn(() => gradient),
      lineTo: vi.fn(), arc: vi.fn(), save: vi.fn(), translate: vi.fn(), rotate: vi.fn(), scale: vi.fn(), restore: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,/9j/2Q==')

    const report = await createAdmissionReportPdf(data)
    const bytes = new Uint8Array(await report.blob.arrayBuffer())
    const pdfText = new TextDecoder('latin1').decode(bytes)

    expect(report.score).toBe(1)
    expect(report.total).toBe(2)
    expect(report.pageCount).toBeGreaterThanOrEqual(2)
    expect(report.blob.type).toBe('application/pdf')
    expect(pdfText.startsWith('%PDF-1.4')).toBe(true)
    expect(context.fillText).toHaveBeenCalledWith('Rezultatul, dintr-o privire', expect.any(Number), expect.any(Number))
    expect(context.fillText).toHaveBeenCalledWith('RĂSPUNSUL ELEVULUI', expect.any(Number), expect.any(Number))
    expect(context.fillText).toHaveBeenCalledWith('REZOLVARE', expect.any(Number), expect.any(Number))

    const send = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({ status: 'sent', message_id: 'email-123', recipient: 'stefan@example.com' }),
    } as Response))
    vi.stubGlobal('fetch', send)
    const delivery = await emailAdmissionReport({ ...data, studentEmail: 'stefan@example.com' })
    expect(delivery).toMatchObject({ status: 'sent', messageId: 'email-123', recipient: 'stefan@example.com' })
    expect(send).toHaveBeenCalledWith('/api/report-service/emails/test-report', expect.objectContaining({ method: 'POST' }))
    const body = JSON.parse((send.mock.calls[0][1] as RequestInit).body as string)
    expect(body).toMatchObject({ recipient_email: 'stefan@example.com', score: 1, total: 2, report_kind: 'admission' })
    expect(atob(body.pdf_base64).startsWith('%PDF-1.4')).toBe(true)

    const longQuestions = Array.from({ length: 20 }, (_, index) => ({
      ...questions[index % questions.length],
      id: `long-${index}`,
      prompt: `${questions[index % questions.length].prompt} `.repeat(index % 4 === 0 ? 18 : 5),
      explanation: `${questions[index % questions.length].explanation} `.repeat(index % 5 === 0 ? 22 : 7),
    }))
    const audit = renderAssessmentReportPages({
      ...data,
      questions: longQuestions,
      answers: Object.fromEntries(longQuestions.map((question) => [question.id, question.correctOptionId])),
    })
    const byPage = audit.placements.reduce((groups, placement) => {
      const existing = groups.get(placement.page) ?? []
      existing.push(placement)
      groups.set(placement.page, existing)
      return groups
    }, new Map<number, typeof audit.placements>())
    byPage.forEach((placements) => {
      placements.forEach((placement, index) => {
        expect(placement.y).toBeGreaterThanOrEqual(136)
        expect(placement.y + placement.height * placement.scale).toBeLessThanOrEqual(1682.001)
        if (index) {
          const previous = placements[index - 1]
          expect(placement.y).toBeGreaterThanOrEqual(previous.y + previous.height * previous.scale)
        }
      })
    })
  })
})
