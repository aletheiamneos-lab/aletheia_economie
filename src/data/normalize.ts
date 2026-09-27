import type { NormalizedQuestion } from '../types'

interface MasterQuestion {
  nr: number
  enunt: string
  variante: Record<string, string>
  raspuns: string
  rezolvare: string
}

interface MasterChapter {
  capitol: number
  titlu: string
  intrebari: MasterQuestion[]
}

interface MasterData {
  capitole: MasterChapter[]
}

interface PracticeQuestion {
  id: string
  tip: 'teorie' | 'exercitiu'
  enunt: string
  optiuni: Array<{ litera: string; text: string; corect: boolean }>
  raspuns_corect: string
  explicatie: string
}

interface PracticeData {
  capitol: number
  intrebari: PracticeQuestion[]
}

export function normalizeFinalQuestions(source: unknown, chapterNumber: number): NormalizedQuestion[] {
  const data = source as MasterData
  const chapter = data.capitole.find((item) => item.capitol === chapterNumber)
  if (!chapter) return []

  return chapter.intrebari.map((question) => ({
    id: `final-c${chapterNumber}-q${question.nr}`,
    source: 'final' as const,
    kind: 'grila' as const,
    prompt: question.enunt,
    options: Object.entries(question.variante).map(([id, text]) => ({ id, text })),
    correctOptionId: question.raspuns.toLowerCase(),
    explanation: question.rezolvare,
  }))
}

export function normalizePracticeQuestions(source: unknown): NormalizedQuestion[] {
  const data = source as PracticeData
  return data.intrebari.map((question) => ({
    id: question.id,
    source: 'practice' as const,
    kind: question.tip,
    prompt: question.enunt,
    options: question.optiuni.map((option) => ({ id: option.litera, text: option.text })),
    correctOptionId: question.raspuns_corect,
    explanation: question.explicatie,
  }))
}

