import type { NormalizedQuestion } from '../types'
import { normalizePracticeQuestions } from './normalize'

const practiceModules = import.meta.glob('./practice/*.json', {
  import: 'default',
}) as Record<string, () => Promise<unknown>>

const practiceLoaders = new Map<number, () => Promise<unknown>>()
const practiceCache = new Map<number, NormalizedQuestion[]>()

Object.entries(practiceModules).forEach(([path, loader]) => {
  const match = path.match(/capitolul-(\d+)-practice\.json$/)
  if (match) practiceLoaders.set(Number(match[1]), loader)
})

export async function loadPracticeQuestions(chapterNumber: number) {
  const cached = practiceCache.get(chapterNumber)
  if (cached) return cached
  const source = await practiceLoaders.get(chapterNumber)?.()
  const questions = source ? normalizePracticeQuestions(source) : []
  practiceCache.set(chapterNumber, questions)
  return questions
}

export const loadRecapQuestions = loadPracticeQuestions

export async function loadAllPracticeQuestions() {
  const entries = await Promise.all(
    Array.from(practiceLoaders.keys()).sort((a, b) => a - b).map(async (chapterNumber) => [chapterNumber, await loadPracticeQuestions(chapterNumber)] as const),
  )
  return Object.fromEntries(entries) as Record<number, NormalizedQuestion[]>
}
