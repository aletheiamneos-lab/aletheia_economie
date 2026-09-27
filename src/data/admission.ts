import type { NormalizedQuestion } from '../types'

export type AdmissionDifficulty = 'usor' | 'mediu' | 'greu' | 'foarte_greu'

export interface AdmissionTestEntry {
  id: string
  year: number
  session: string
  variant: string
  filename: string
  questionCount: number
  economyRange: string
  difficultyCounts: Partial<Record<AdmissionDifficulty, number>>
  subjectSource: string
  answerSource: string
  note: string | null
}

export interface AdmissionManifest {
  version: number
  testCount: number
  totalQuestions: number
  formulaQuestions: number
  yearRange: [number, number]
  tests: AdmissionTestEntry[]
}

interface AdmissionSourceQuestion {
  numar_in_test: number
  capitol: string
  dificultate: AdmissionDifficulty
  enunt: string
  optiuni: Record<'a' | 'b' | 'c' | 'd', string>
  raspuns_corect: 'a' | 'b' | 'c' | 'd'
  formula_utilizata: string | null
  rezolvare: string
}

interface AdmissionSource {
  an: number
  sesiune: string
  varianta: string
  grupe: Array<{ exercitii: AdmissionSourceQuestion[] }>
}

const admissionRoot = `${import.meta.env.BASE_URL}admission-tests`

async function readJson<T>(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error('Materialul de admitere nu a putut fi încărcat.')
  return response.json() as Promise<T>
}

export async function loadAdmissionManifest(signal?: AbortSignal) {
  const manifest = await readJson<AdmissionManifest>(`${admissionRoot}/manifest.json`, signal)
  if (manifest.version !== 1 || manifest.tests.length !== manifest.testCount) throw new Error('Catalogul testelor de admitere este invalid.')
  return manifest
}

export async function loadAdmissionTest(entry: AdmissionTestEntry, signal?: AbortSignal) {
  return readJson<AdmissionSource>(`${admissionRoot}/data/${encodeURIComponent(entry.filename)}`, signal)
}

export function normalizeAdmissionQuestions(source: AdmissionSource, testId: string): NormalizedQuestion[] {
  return source.grupe
    .flatMap((group) => group.exercitii)
    .sort((left, right) => left.numar_in_test - right.numar_in_test)
    .map((question) => ({
      id: `admission-${testId}-q${question.numar_in_test}`,
      source: 'admission' as const,
      kind: question.formula_utilizata ? 'exercitiu' as const : 'teorie' as const,
      prompt: question.enunt,
      options: Object.entries(question.optiuni).map(([id, text]) => ({ id, text })),
      correctOptionId: question.raspuns_corect,
      explanation: question.rezolvare,
      formula: question.formula_utilizata ?? undefined,
      originalNumber: question.numar_in_test,
      topic: question.capitol,
      difficulty: question.dificultate,
    }))
}
