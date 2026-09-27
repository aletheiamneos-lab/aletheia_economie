import type { LessonData } from '../types'

type RawLesson = Partial<LessonData> & Pick<LessonData, 'capitol' | 'teorie'>

const lessonModules = import.meta.glob('./chapters/*.json', {
  import: 'default',
}) as Record<string, () => Promise<RawLesson>>

const lessonLoaders = new Map<number, () => Promise<RawLesson>>()
const lessonCache = new Map<number, LessonData>()

Object.entries(lessonModules).forEach(([path, loader]) => {
  const match = path.match(/capitolul-(\d+)-continut\.json$/)
  if (match) lessonLoaders.set(Number(match[1]), loader)
})

function normalizeLesson(lesson: RawLesson): LessonData {
  return {
    ...lesson,
    capitol: lesson.capitol,
    teorie: lesson.teorie,
    grila: lesson.grila ?? [],
    af: lesson.af ?? [],
    probleme: lesson.probleme ?? [],
    asociere: lesson.asociere ?? [],
  }
}

export async function loadLesson(chapterNumber: number) {
  const cached = lessonCache.get(chapterNumber)
  if (cached) return cached
  const source = await lessonLoaders.get(chapterNumber)?.()
  if (!source) return null
  const lesson = normalizeLesson(source)
  lessonCache.set(chapterNumber, lesson)
  return lesson
}

export async function loadAllLessons() {
  const entries = await Promise.all(
    Array.from(lessonLoaders.keys()).sort((a, b) => a - b).map(async (chapterNumber) => [chapterNumber, await loadLesson(chapterNumber)] as const),
  )
  return Object.fromEntries(entries.filter((entry): entry is readonly [number, LessonData] => entry[1] !== null)) as Record<number, LessonData>
}
