import { AlertCircle, ArrowLeft, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  loadAdmissionManifest,
  loadAdmissionTest,
  normalizeAdmissionQuestions,
  type AdmissionTestEntry,
} from '../data/admission'
import type { SessionApi } from '../session'
import type { NormalizedQuestion } from '../types'
import { AssessmentPage } from './AssessmentPage'

interface AdmissionAssessmentPageProps {
  testId: string
  sessionApi: SessionApi
  onNavigate: (path: string) => void
}

interface LoadedAdmissionTest {
  entry: AdmissionTestEntry
  questions: NormalizedQuestion[]
}

export function AdmissionAssessmentPage({ testId, sessionApi, onNavigate }: AdmissionAssessmentPageProps) {
  const [loaded, setLoaded] = useState<LoadedAdmissionTest | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    setLoaded(null)
    setError('')

    loadAdmissionManifest(controller.signal)
      .then(async (manifest) => {
        const entry = manifest.tests.find((test) => test.id === testId)
        if (!entry) throw new Error('Testul de admitere solicitat nu există în arhivă.')
        const source = await loadAdmissionTest(entry, controller.signal)
        return { entry, questions: normalizeAdmissionQuestions(source, entry.id) }
      })
      .then(setLoaded)
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) {
          setError(reason instanceof Error ? reason.message : 'Testul nu a putut fi încărcat.')
        }
      })

    return () => controller.abort()
  }, [testId])

  if (error) {
    return (
      <div className="admission-state page-enter">
        <AlertCircle size={28}/>
        <h1>Test indisponibil</h1>
        <p>{error}</p>
        <button className="button button-primary" onClick={() => onNavigate('#/teste-admitere')}><ArrowLeft size={17}/> Înapoi la arhivă</button>
      </div>
    )
  }

  if (!loaded) {
    return <div className="admission-state admission-loading page-enter"><LoaderCircle className="admission-spinner" size={28}/><p>Se pregătește testul…</p></div>
  }

  const { entry, questions } = loaded
  return (
    <AssessmentPage
      key={entry.id}
      chapterNumber={entry.year}
      chapterTitle={`${entry.session} · ${entry.variant}`}
      mode="admission"
      questions={questions}
      sessionApi={sessionApi}
      onNavigate={onNavigate}
      admissionContext={{
        variant: entry.variant,
        session: entry.session,
        economyRange: entry.economyRange,
        subjectSource: entry.subjectSource,
        answerSource: entry.answerSource,
        note: entry.note,
      }}
    />
  )
}
