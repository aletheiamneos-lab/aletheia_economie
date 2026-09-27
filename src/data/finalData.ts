import finalTestsRaw from './final-tests-master.json'
import type { NormalizedQuestion } from '../types'
import { normalizeFinalQuestions } from './normalize'

export const finalQuestionsByChapter = Object.fromEntries(
  Array.from({ length: 19 }, (_, index) => {
    const chapterNumber = index + 1
    return [chapterNumber, normalizeFinalQuestions(finalTestsRaw, chapterNumber)]
  }),
) as Record<number, NormalizedQuestion[]>

export function getFinalQuestions(chapterNumber: number) {
  return finalQuestionsByChapter[chapterNumber] ?? []
}
