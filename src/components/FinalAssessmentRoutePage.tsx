import { AssessmentPage } from './AssessmentPage'
import { chapters } from '../data/catalog'
import { getFinalQuestions } from '../data/finalData'
import type { SessionApi } from '../session'

interface FinalAssessmentRoutePageProps {
  chapter: number
  sessionApi: SessionApi
  onNavigate: (path: string) => void
}

export function FinalAssessmentRoutePage({ chapter, sessionApi, onNavigate }: FinalAssessmentRoutePageProps) {
  const chapterMeta = chapters.find((item) => item.number === chapter) ?? chapters[0]
  return (
    <AssessmentPage
      chapterNumber={chapter}
      chapterTitle={chapterMeta.title}
      mode="final"
      questions={getFinalQuestions(chapter)}
      sessionApi={sessionApi}
      onNavigate={onNavigate}
    />
  )
}
