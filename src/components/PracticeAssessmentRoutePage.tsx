import { AssessmentPage } from './AssessmentPage'
import { useEffect, useState } from 'react'
import { chapters } from '../data/catalog'
import { loadPracticeQuestions, loadRecapQuestions } from '../data/practiceData'
import type { SessionApi } from '../session'
import type { NormalizedQuestion } from '../types'

interface PracticeAssessmentRoutePageProps {
  chapter: number
  mode: 'practice' | 'recap'
  sessionApi: SessionApi
  onNavigate: (path: string) => void
}

export function PracticeAssessmentRoutePage({ chapter, mode, sessionApi, onNavigate }: PracticeAssessmentRoutePageProps) {
  const chapterMeta = chapters.find((item) => item.number === chapter) ?? chapters[0]
  const [questions, setQuestions] = useState<NormalizedQuestion[] | null>(null)

  useEffect(() => {
    let active = true
    setQuestions(null)
    const loader = mode === 'practice' ? loadPracticeQuestions : loadRecapQuestions
    loader(chapter).then((loadedQuestions) => {
      if (active) setQuestions(loadedQuestions)
    })
    return () => { active = false }
  }, [chapter, mode])

  if (!questions) return <div className="route-loading" role="status"><span />Se pregătesc întrebările…</div>

  return (
    <AssessmentPage
      chapterNumber={chapter}
      chapterTitle={chapterMeta.title}
      mode={mode}
      questions={questions}
      sessionApi={sessionApi}
      onNavigate={onNavigate}
    />
  )
}
