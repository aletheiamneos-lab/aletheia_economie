import { describe, expect, it } from 'vitest'
import { chapters } from './catalog'
import { finalQuestionsByChapter, loadAllLessons, loadAllPracticeQuestions } from './course'

describe('real course content', () => {
  it('loads all 19 native lesson structures', async () => {
    const lessonsByChapter = await loadAllLessons()
    expect(Object.keys(lessonsByChapter)).toHaveLength(19)
    expect(chapters).toHaveLength(19)

    for (const chapter of chapters) {
      const lesson = lessonsByChapter[chapter.number]
      expect(lesson, `missing lesson ${chapter.number}`).toBeDefined()
      expect(lesson.capitol.numar).toBe(chapter.number)
      expect(lesson.capitol.obiective.length).toBeGreaterThan(0)
      expect(lesson.teorie.length).toBeGreaterThan(0)
      expect(lesson.grila.length + lesson.af.length + lesson.probleme.length + lesson.asociere.length).toBeGreaterThan(0)
    }
  })

  it('loads a complete 30-question final assessment for every chapter', () => {
    for (const chapter of chapters) {
      const questions = finalQuestionsByChapter[chapter.number]
      expect(questions, `missing final test ${chapter.number}`).toHaveLength(30)
      expect(questions.every((question) => question.options.length > 1)).toBe(true)
      expect(questions.every((question) => question.options.some((option) => option.id === question.correctOptionId))).toBe(true)
      expect(questions.every((question) => question.explanation.length > 0)).toBe(true)
    }
  })

  it('loads the complete 40-question practice bank for every chapter', async () => {
    const practiceQuestionsByChapter = await loadAllPracticeQuestions()
    for (const chapter of chapters) {
      const questions = practiceQuestionsByChapter[chapter.number]
      expect(questions, `missing practice bank ${chapter.number}`).toHaveLength(40)
      expect(questions.every((question) => ['teorie', 'exercitiu'].includes(question.kind))).toBe(true)
      expect(questions.some((question) => question.kind === 'teorie')).toBe(true)
      expect(questions.every((question) => question.options.some((option) => option.id === question.correctOptionId))).toBe(true)
      expect(questions.every((question) => question.explanation.length > 0)).toBe(true)
    }
  })
})
