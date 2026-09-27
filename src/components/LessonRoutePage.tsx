import { LessonPage } from './LessonPage'
import { useEffect, useState } from 'react'
import { chapters } from '../data/catalog'
import { loadLesson } from '../data/lessonData'
import type { SessionApi } from '../session'
import type { LessonData } from '../types'

interface LessonRoutePageProps {
  chapter: number
  initialSection?: string
  sessionApi: SessionApi
  onNavigate: (path: string) => void
  onOpenNotes: () => void
}

export function LessonRoutePage({ chapter, initialSection, sessionApi, onNavigate, onOpenNotes }: LessonRoutePageProps) {
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const chapterMeta = chapters.find((item) => item.number === chapter) ?? chapters[0]

  useEffect(() => {
    let active = true
    setLesson(null)
    loadLesson(chapter).then((loadedLesson) => {
      if (active) setLesson(loadedLesson)
    })
    return () => { active = false }
  }, [chapter])

  if (!lesson) return <div className="route-loading" role="status"><span />Se pregătește lecția…</div>

  return (
    <LessonPage
      lesson={lesson}
      chapterMeta={chapterMeta}
      initialSection={initialSection}
      sessionApi={sessionApi}
      onNavigate={onNavigate}
      onOpenNotes={onOpenNotes}
    />
  )
}
