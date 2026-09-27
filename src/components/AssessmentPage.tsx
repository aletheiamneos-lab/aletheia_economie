import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Download,
  FileText,
  FileQuestion,
  Flag,
  Lightbulb,
  ListChecks,
  LoaderCircle,
  Mail,
  RefreshCcw,
  Send,
  Trophy,
  X,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { downloadAdmissionReport, emailAdmissionReport, type AdmissionReportData } from '../admissionReport'
import { submitReport, trackActivity } from '../api'
import type { SessionApi } from '../session'
import type { NormalizedQuestion } from '../types'

interface AssessmentPageProps {
  chapterNumber: number
  chapterTitle: string
  mode: 'final' | 'practice' | 'recap' | 'admission'
  questions: NormalizedQuestion[]
  sessionApi: SessionApi
  onNavigate: (path: string) => void
  testId?: string
  admissionContext?: {
    variant: string
    session: string
    economyRange: string
    subjectSource: string
    answerSource: string
    note: string | null
  }
}

type Phase = 'intro' | 'taking' | 'results'
type PracticeFilter = 'all' | 'teorie' | 'exercitiu'

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
  const rest = (seconds % 60).toString().padStart(2, '0')
  return `${minutes}:${rest}`
}

function ScoreRing({ score, total }: { score: number; total: number }) {
  const percentage = total ? Math.round((score / total) * 100) : 0
  const radius = 64
  const circumference = Math.PI * 2 * radius
  return (
    <div className="score-ring">
      <svg viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} className="ring-track" />
        <circle cx="80" cy="80" r={radius} className="ring-value" strokeDasharray={circumference} strokeDashoffset={circumference - circumference * percentage / 100} />
      </svg>
      <div><b>{percentage}%</b><span>{score} din {total}</span></div>
    </div>
  )
}

export function AssessmentPage({ chapterNumber, chapterTitle, mode, questions, sessionApi, onNavigate, testId, admissionContext }: AssessmentPageProps) {
  const isFinal = mode === 'final'
  const isRecap = mode === 'recap'
  const isAdmission = mode === 'admission'
  const hidesFeedbackUntilSubmit = mode !== 'practice'
  const backPath = isAdmission ? '#/teste-admitere' : isRecap ? '#/teste-recapitulative' : `#/capitol/${chapterNumber}`
  const backLabel = isAdmission ? 'Înapoi la testele de admitere' : isRecap ? 'Înapoi la testele recapitulative' : 'Înapoi la lecție'
  const testName = isAdmission ? `Admitere ${admissionContext?.variant ?? ''}`.trim() : isRecap ? 'Test recapitulativ' : isFinal ? 'Test final' : 'Antrenament'
  const theoryCount = questions.filter((question) => question.kind === 'teorie').length
  const exerciseCount = questions.filter((question) => question.kind === 'exercitiu').length
  const [phase, setPhase] = useState<Phase>('intro')
  const [filter, setFilter] = useState<PracticeFilter>('all')
  const selectedCount = hidesFeedbackUntilSubmit || filter === 'all' ? questions.length : filter === 'teorie' ? theoryCount : exerciseCount
  const [sessionQuestions, setSessionQuestions] = useState(questions)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [flags, setFlags] = useState<string[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [showSubmit, setShowSubmit] = useState(false)
  const [studentName, setStudentName] = useState(sessionApi.session.userName ?? '')
  const [studentEmail, setStudentEmail] = useState(sessionApi.session.userEmail ?? '')
  const [reportBusy, setReportBusy] = useState<'download' | 'email' | null>(null)
  const [reportMessage, setReportMessage] = useState('')
  const [reportError, setReportError] = useState('')
  const autoEmailAttempted = useRef(false)
  const reportSaved = useRef(false)
  const [archiveCode, setArchiveCode] = useState('')
  const isDemo = Boolean(sessionApi.session.isDemo)
  const isStudent = sessionApi.session.userRole === 'student' && !isDemo
  const isGraded = isAdmission || isFinal || isRecap
  const activityKey = isAdmission ? `admission-${testId ?? `${chapterNumber}-${admissionContext?.variant ?? ''}`}` : `${mode}-${chapterNumber}`
  const activityName = isAdmission
    ? `Admitere ${chapterNumber} · ${admissionContext?.variant ?? ''}`.trim()
    : `${isRecap ? 'Test recapitulativ' : 'Test final'} · Capitolul ${String(chapterNumber).padStart(2, '0')}`

  const current = sessionQuestions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const score = useMemo(() => sessionQuestions.reduce((total, question) => total + (answers[question.id] === question.correctOptionId ? 1 : 0), 0), [answers, sessionQuestions])
  const percentage = sessionQuestions.length ? Math.round((score / sessionQuestions.length) * 100) : 0
  const currentAnswered = current ? answers[current.id] : undefined
  const recapCompleted = sessionApi.session.completedRecapTests.includes(chapterNumber)

  useEffect(() => {
    if (phase !== 'taking') return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [phase])

  useEffect(() => {
    if (phase !== 'taking' || !isStudent || !isGraded || sessionQuestions.length === 0) return
    const progress = Math.round((answeredCount / sessionQuestions.length) * 100)
    const timer = window.setTimeout(() => {
      void trackActivity({ activity_key: activityKey, test_name: activityName, progress: Math.min(progress, 99) })
    }, answeredCount === 0 ? 0 : 3000)
    return () => window.clearTimeout(timer)
  }, [phase, answeredCount])

  useEffect(() => {
    if (phase !== 'results' || !isStudent || !isGraded || reportSaved.current) return
    reportSaved.current = true
    const total = sessionQuestions.length
    void trackActivity({ activity_key: activityKey, test_name: activityName, progress: 100, state: 'finished', score, total })
    submitReport({
      report_type: isAdmission ? 'admission' : isRecap ? 'recap' : 'final',
      test_name: isAdmission ? activityName : `${isRecap ? 'Test recapitulativ' : 'Test final'} · ${chapterTitle}`,
      test_id: isAdmission ? testId : undefined,
      chapter_number: isAdmission ? undefined : chapterNumber,
      year: isAdmission ? chapterNumber : undefined,
      session_label: isAdmission ? admissionContext?.session : undefined,
      variant: isAdmission ? admissionContext?.variant : undefined,
      economy_range: isAdmission ? admissionContext?.economyRange : undefined,
      score,
      total,
      elapsed_seconds: elapsed,
      question_ids: sessionQuestions.map((question) => question.id),
      answers,
    })
      .then((result) => setArchiveCode(result.archiveCode))
      .catch((reason: unknown) => setReportError(`Rezultatul nu a putut fi salvat pe server: ${reason instanceof Error ? reason.message : 'eroare necunoscută'}.`))
  }, [phase])

  const start = () => {
    const selectedQuestions = hidesFeedbackUntilSubmit || filter === 'all' ? questions : questions.filter((question) => question.kind === filter)
    setSessionQuestions(selectedQuestions)
    setAnswers({})
    setFlags([])
    setCurrentIndex(0)
    setElapsed(0)
    setReportMessage('')
    setReportError('')
    autoEmailAttempted.current = false
    reportSaved.current = false
    setArchiveCode('')
    setPhase('taking')
  }

  const finish = () => {
    if (isRecap && answeredCount < sessionQuestions.length) return
    setShowSubmit(false)
    setPhase('results')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const chooseAnswer = (optionId: string) => {
    if (!current || (!hidesFeedbackUntilSubmit && currentAnswered)) return
    setAnswers((existing) => ({ ...existing, [current.id]: optionId }))
  }

  const toggleFlag = () => {
    if (!current) return
    setFlags((existing) => existing.includes(current.id) ? existing.filter((id) => id !== current.id) : [...existing, current.id])
  }

  const next = () => {
    if (currentIndex < sessionQuestions.length - 1) setCurrentIndex((value) => value + 1)
    else if (!hidesFeedbackUntilSubmit) finish()
  }

  const continueUnanswered = () => {
    const firstUnanswered = sessionQuestions.findIndex((question) => !answers[question.id])
    if (firstUnanswered >= 0) setCurrentIndex(firstUnanswered)
    setShowSubmit(false)
  }

  const assessmentReportData = (): AdmissionReportData | null => {
    if (!isAdmission && !isFinal && !isRecap) return null
    const test = isAdmission && admissionContext
      ? {
          kind: 'admission' as const,
          year: chapterNumber,
          session: admissionContext.session,
          variant: admissionContext.variant,
          economyRange: admissionContext.economyRange,
        }
      : {
          kind: isRecap ? 'recap' as const : 'chapter' as const,
          year: new Date().getFullYear(),
          session: `Capitolul ${chapterNumber}`,
          variant: isRecap ? 'Test recapitulativ' : 'Test final',
          economyRange: chapterTitle,
          chapterNumber,
          chapterTitle,
        }
    return {
      studentName: studentName.trim(),
      studentEmail: studentEmail.trim() || undefined,
      elapsedSeconds: elapsed,
      test,
      questions: sessionQuestions,
      answers,
    }
  }

  const validateReportIdentity = (requiresEmail: boolean) => {
    if (!studentName.trim()) {
      setReportError('Completează numele elevului înainte de generarea raportului.')
      return false
    }
    if (requiresEmail && !/^\S+@\S+\.\S+$/.test(studentEmail.trim())) {
      setReportError('Introdu o adresă de e-mail validă pentru elev.')
      return false
    }
    setReportError('')
    setReportMessage('')
    return true
  }

  const downloadReport = async () => {
    if (!validateReportIdentity(false)) return
    const data = assessmentReportData()
    if (!data) return
    try {
      setReportBusy('download')
      const report = await downloadAdmissionReport(data)
      setReportMessage(`Raport generat: ${report.pageCount} ${report.pageCount === 1 ? 'pagină' : 'pagini'}.`)
    } catch (reason) {
      setReportError(reason instanceof Error ? reason.message : 'Raportul nu a putut fi generat.')
    } finally {
      setReportBusy(null)
    }
  }

  const sendReportByEmail = async (automatic = false) => {
    if (!validateReportIdentity(true)) return
    const data = assessmentReportData()
    if (!data) return
    try {
      setReportBusy('email')
      const result = await emailAdmissionReport(data)
      setReportMessage(`Raportul și PDF-ul complet au fost trimise la ${result.recipient}.`)
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Raportul nu a putut fi trimis.'
      setReportError(automatic ? `${message} Poți reîncerca din secțiunea raportului.` : message)
    } finally {
      setReportBusy(null)
    }
  }

  useEffect(() => {
    if (phase !== 'results' || !isStudent || (!isAdmission && !isFinal && !isRecap) || autoEmailAttempted.current) return
    autoEmailAttempted.current = true
    void sendReportByEmail(true)
  }, [phase])

  if (phase === 'intro') {
    return (
      <div className="assessment-page assessment-intro page-enter">
        <button className="back-button" onClick={() => onNavigate(backPath)}><ArrowLeft size={18} /> {backLabel}</button>
        <div className="assessment-intro-grid">
          <section className={`assessment-intro-card ${isAdmission ? 'admission' : isRecap ? 'recap' : isFinal ? 'final' : 'practice'}`}>
            <span className="assessment-big-icon">{hidesFeedbackUntilSubmit ? <FileQuestion size={34} /> : <BrainCircuit size={34} />}</span>
            <span className="chapter-label">{isAdmission ? `${admissionContext?.variant} · ${admissionContext?.economyRange} din grila originală` : `Capitolul ${String(chapterNumber).padStart(2, '0')} · ${isRecap ? 'Recapitulare' : isFinal ? 'Evaluare' : 'Antrenament'}`}</span>
            <h1>{isAdmission ? admissionContext?.session : isRecap ? 'Test recapitulativ' : isFinal ? 'Test final' : 'Banca de exerciții'}</h1>
            <p><b>{isAdmission ? 'Test real de admitere la economie.' : `${chapterTitle}.`}</b> {hidesFeedbackUntilSubmit ? 'Răspunde fără indicii. După trimitere vei vedea varianta corectă și explicația fiecărei întrebări.' : 'Exersează cu feedback imediat, integral sau pe un singur tip de întrebare.'}</p>
            <div className="assessment-facts">
              <div><ListChecks size={19} /><span><b>{selectedCount}</b> întrebări</span></div>
              <div><Clock3 size={19} /><span><b>{isAdmission ? '30–50' : isRecap ? '45–60' : isFinal ? '30–40' : '20–50'}</b> minute</span></div>
              <div><Lightbulb size={19} /><span><b>Explicații</b> detaliate</span></div>
            </div>

            {!hidesFeedbackUntilSubmit && (
              <div className="practice-filter">
                <span>Alege sesiunea</span>
                <div>
                  <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}><b>{questions.length}</b> Mixt</button>
                  <button className={filter === 'teorie' ? 'active' : ''} onClick={() => setFilter('teorie')}><b>{theoryCount}</b> Teorie</button>
                  <button className={filter === 'exercitiu' ? 'active' : ''} onClick={() => setFilter('exercitiu')}><b>{exerciseCount}</b> Aplicații</button>
                </div>
              </div>
            )}

            <button className="button assessment-start" onClick={start}>Începe {hidesFeedbackUntilSubmit ? 'testul' : 'sesiunea'} <ArrowRight size={18} /></button>
          </section>

          <aside className="assessment-guide">
            <span className="page-kicker">Înainte să începi</span>
            <h2>{hidesFeedbackUntilSubmit ? 'Cum funcționează testul' : 'Cum funcționează antrenamentul'}</h2>
            <ol>
              <li><span>01</span><div><b>{hidesFeedbackUntilSubmit ? 'Lucrează în ritmul tău' : 'Răspunde pe rând'}</b><p>{hidesFeedbackUntilSubmit ? 'Cronometrul este informativ; nu există limită rigidă.' : 'După alegere vezi imediat dacă ai răspuns corect.'}</p></div></li>
              <li><span>02</span><div><b>{hidesFeedbackUntilSubmit ? 'Marchează întrebările incerte' : 'Citește rezolvarea'}</b><p>{hidesFeedbackUntilSubmit ? 'Poți reveni și schimba orice răspuns înainte de trimitere.' : 'Fiecare explicație leagă răspunsul de teoria capitolului.'}</p></div></li>
              <li><span>03</span><div><b>Revizuiește fiecare răspuns</b><p>După finalizare poți compara alegerea ta cu varianta corectă și explicația completă.</p></div></li>
            </ol>
            {isAdmission && admissionContext && <div className="admission-source-list"><p><b>Subiect:</b> {admissionContext.subjectSource}</p><p><b>Barem:</b> {admissionContext.answerSource}</p>{admissionContext.note && <p><b>Notă:</b> {admissionContext.note}</p>}</div>}
          </aside>
        </div>
      </div>
    )
  }

  if (phase === 'results') {
    const passed = percentage >= 70
    return (
      <div className="assessment-page results-page page-enter">
        <button className="back-button" onClick={() => onNavigate(backPath)}><ArrowLeft size={18} /> {isAdmission ? 'Toate testele de admitere' : isRecap ? 'Toate testele recapitulative' : 'Înapoi la lecție'}</button>
        <section className={`result-hero ${passed ? 'passed' : 'retry'}`}>
          <div className="result-copy">
            <span className="result-icon">{passed ? <Trophy size={27} /> : <RefreshCcw size={27} />}</span>
            <span className="page-kicker">Rezultatul tău</span>
            <h1>{passed ? 'Foarte bine — fundația e solidă.' : 'E un început bun. Mai facem o tură?'}</h1>
            <p>{passed ? 'Ai demonstrat că poți recunoaște și aplica ideile centrale ale capitolului.' : 'Revizuiește explicațiile de mai jos, apoi încearcă din nou. Corectarea activă te ajută să fixezi conceptele.'}</p>
            <div className="result-actions">
              <button className="button button-primary" onClick={start}><RefreshCcw size={17} /> Încearcă din nou</button>
              {isRecap && <button className={`button manual-result-status ${recapCompleted ? 'is-complete' : ''}`} onClick={() => sessionApi.toggleRecapCompletion(chapterNumber)}><CheckCircle2 size={17}/> {recapCompleted ? 'Marcat parcurs' : 'Marchează parcurs'}</button>}
              <button className="button button-ghost" onClick={() => onNavigate(backPath)}>{isAdmission ? 'Alege alt test' : isRecap ? 'Alege alt capitol' : 'Revino la lecție'}</button>
            </div>
          </div>
          <ScoreRing score={score} total={sessionQuestions.length} />
          <div className="result-stat-grid">
            <div className="correct"><CheckCircle2 size={18} /><span><b>{score}</b> corecte</span></div>
            <div className="wrong"><XCircle size={18} /><span><b>{sessionQuestions.length - score}</b> greșite</span></div>
            <div><Clock3 size={18} /><span><b>{formatTime(elapsed)}</b> timp</span></div>
          </div>
        </section>

        {(isAdmission || isFinal || isRecap) && (
          <section className="admission-report-panel" aria-labelledby="admission-report-title">
            <div className="admission-report-copy">
              <span className="admission-report-icon"><FileText size={23}/></span>
              <div>
                <span className="page-kicker">Raport PDF + e-mail</span>
                <h2 id="admission-report-title">Raportul complet, trimis direct elevului</h2>
                <p>E-mailul conține un rezumat vizual, iar PDF-ul atașat include timpul, harta răspunsurilor, variantele corecte, formulele și rezolvările complete.</p>
              </div>
            </div>
            <div className="admission-report-form">
              <label><span>Numele elevului</span><input value={studentName} onChange={(event) => setStudentName(event.target.value)} placeholder="Ex.: Andrei Popescu" autoComplete="name"/></label>
              <label><span>E-mailul elevului</span><input type="email" value={studentEmail} onChange={(event) => setStudentEmail(event.target.value)} placeholder="elev@exemplu.ro" autoComplete="email" readOnly={isStudent}/></label>
              <div className="admission-report-actions">
                <button className="button button-primary" disabled={reportBusy !== null} onClick={downloadReport}>{reportBusy === 'download' ? <LoaderCircle className="admission-spinner" size={17}/> : <Download size={17}/>} Descarcă raportul</button>
{!isDemo &&                 <button className="button admission-email-button" disabled={reportBusy !== null} onClick={() => void sendReportByEmail(false)}>{reportBusy === 'email' ? <LoaderCircle className="admission-spinner" size={17}/> : <Mail size={17}/>} {reportMessage ? 'Retrimite pe e-mail' : 'Trimite pe e-mail'}</button>}
              </div>
              {reportError && <p className="admission-report-feedback error" role="alert">{reportError}</p>}
              {reportMessage && <p className="admission-report-feedback success" role="status">{reportMessage}</p>}
              {archiveCode && <p className="admission-report-feedback success">Rezultatul a fost salvat în arhiva profesorului · cod <b>{archiveCode}</b></p>}
              <small className="admission-email-note">Pentru elev, trimiterea pornește automat la finalizarea testului. Adresa poate fi verificată aici, iar raportul poate fi retrimis oricând.</small>
            </div>
          </section>
        )}

        <section className="review-section">
          <div className="section-heading"><div><span className="page-kicker">Analiza răspunsurilor</span><h2>Învață din fiecare alegere</h2></div><span className="section-note">Selectează o întrebare pentru explicație</span></div>
          <div className="review-grid">
            {sessionQuestions.map((question, index) => {
              const correct = answers[question.id] === question.correctOptionId
              return <button key={question.id} className={correct ? 'correct' : 'wrong'} onClick={() => setCurrentIndex(index)}><span>{question.originalNumber ?? index + 1}</span>{correct ? <Check size={14} /> : <X size={14} />}</button>
            })}
          </div>
          {current && (
            <article className="review-card">
              <div className="exercise-card-top"><span>Întrebarea {current.originalNumber ?? currentIndex + 1}</span><span className={answers[current.id] === current.correctOptionId ? 'review-status correct' : 'review-status wrong'}>{answers[current.id] === current.correctOptionId ? 'Răspuns corect' : 'Răspuns greșit'}</span></div>
              <h3>{current.prompt}</h3>
              <div className="review-options">
                {current.options.map((option) => {
                  const isCorrect = option.id === current.correctOptionId
                  const wasChosen = option.id === answers[current.id]
                  return <div key={option.id} className={isCorrect ? 'correct' : wasChosen ? 'wrong' : ''}><span>{option.id.toUpperCase()}</span><p>{option.text}</p>{isCorrect && <Check size={17} />}{wasChosen && !isCorrect && <X size={17} />}</div>
                })}
              </div>
              <div className="explanation-panel"><Lightbulb size={19} /><div><b>Rezolvare</b>{current.formula && <code className="solution-formula">{current.formula}</code>}<p>{current.explanation}</p></div></div>
            </article>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="assessment-page taking-page page-enter">
      <header className="test-topbar">
        <button className="icon-button" onClick={() => onNavigate(backPath)} aria-label="Ieși din test"><X size={20} /></button>
        <div><span>{isAdmission ? `${testName} · ${chapterTitle}` : `${testName} · Capitolul ${String(chapterNumber).padStart(2, '0')} · ${chapterTitle}`}</span><div className="test-progress-track"><i style={{ width: `${((currentIndex + 1) / sessionQuestions.length) * 100}%` }} /></div></div>
        <span className="test-timer"><Clock3 size={16} /> {formatTime(elapsed)}</span>
      </header>

      <div className="test-layout">
        <aside className="question-navigator">
          <div className="navigator-heading"><span>Întrebări</span><b>{answeredCount}/{sessionQuestions.length}</b></div>
          <div className="question-grid">
            {sessionQuestions.map((question, index) => (
              <button
                key={question.id}
                className={`${currentIndex === index ? 'current' : ''} ${answers[question.id] ? 'answered' : ''} ${flags.includes(question.id) ? 'flagged' : ''}`}
                onClick={() => setCurrentIndex(index)}
              >{question.originalNumber ?? index + 1}</button>
            ))}
          </div>
          <div className="navigator-legend"><span><i className="answered" /> răspuns</span><span><i className="flagged" /> marcată</span></div>
          {hidesFeedbackUntilSubmit && <button className="button button-primary submit-sidebar" onClick={() => setShowSubmit(true)}><Send size={16} /> Trimite testul</button>}
        </aside>

        {current && (
          <main className="question-stage">
            <div className="question-meta-row">
              <span>Întrebarea {current.originalNumber ?? currentIndex + 1} · {currentIndex + 1} din {sessionQuestions.length}</span>
              <span className="question-type">{current.kind === 'exercitiu' ? 'Aplicație' : 'Teorie'}</span>
              {current.difficulty && <span className={`question-difficulty ${current.difficulty}`}>{current.difficulty.replace('_', ' ')}</span>}
              {hidesFeedbackUntilSubmit && <button className={flags.includes(current.id) ? 'active' : ''} onClick={toggleFlag}><Flag size={15} fill={flags.includes(current.id) ? 'currentColor' : 'none'} /> {flags.includes(current.id) ? 'Marcată' : 'Marchează'}</button>}
            </div>
            <h1>{current.prompt}</h1>
            <div className="test-options">
              {current.options.map((option) => {
                const selected = currentAnswered === option.id
                const reveal = !hidesFeedbackUntilSubmit && Boolean(currentAnswered)
                const state = reveal && option.id === current.correctOptionId ? 'correct' : reveal && selected ? 'wrong' : selected ? 'selected' : ''
                return (
                  <button key={option.id} className={state} disabled={reveal} onClick={() => chooseAnswer(option.id)}>
                    <span>{option.id.toUpperCase()}</span><p>{option.text}</p>
                    {state === 'correct' && <CheckCircle2 size={20} />}{state === 'wrong' && <XCircle size={20} />}
                  </button>
                )
              })}
            </div>
            {!hidesFeedbackUntilSubmit && currentAnswered && (
              <div className={`practice-feedback ${currentAnswered === current.correctOptionId ? 'correct' : 'wrong'}`}>
                {currentAnswered === current.correctOptionId ? <CheckCircle2 size={22} /> : <AlertCircle size={22} />}
                <div><b>{currentAnswered === current.correctOptionId ? 'Ai răspuns corect.' : `Varianta corectă este ${current.correctOptionId.toUpperCase()}.`}</b>{current.formula && <code className="solution-formula">{current.formula}</code>}<p>{current.explanation}</p></div>
              </div>
            )}
            <div className="question-actions">
              <button className="button button-ghost" disabled={currentIndex === 0} onClick={() => setCurrentIndex((value) => value - 1)}><ChevronLeft size={17} /> Anterior</button>
              {hidesFeedbackUntilSubmit && currentIndex === sessionQuestions.length - 1 ? (
                <button className="button button-primary" onClick={() => setShowSubmit(true)}>Finalizează <Send size={17} /></button>
              ) : (
                <button className="button button-primary" disabled={!hidesFeedbackUntilSubmit && !currentAnswered} onClick={next}>{currentIndex === sessionQuestions.length - 1 ? 'Vezi rezultatul' : 'Următoarea'} <ArrowRight size={17} /></button>
              )}
            </div>
          </main>
        )}
      </div>

      {showSubmit && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="Trimite testul">
          <button className="modal-scrim" onClick={() => setShowSubmit(false)} aria-label="Închide" />
          <div className="submit-modal">
            <span className="modal-icon"><BookOpenCheck size={25} /></span>
            <h2>Trimiți testul?</h2>
            <p>Ai răspuns la <b>{answeredCount} din {sessionQuestions.length}</b> întrebări. După trimitere vei vedea scorul și toate explicațiile.</p>
            {answeredCount < sessionQuestions.length && <div className="unanswered-warning"><Flag size={17} /> Au rămas {sessionQuestions.length - answeredCount} întrebări fără răspuns.{isRecap && ' Testul recapitulativ poate fi trimis numai după completarea tuturor.'}</div>}
            <div>
              <button className="button button-ghost" onClick={() => setShowSubmit(false)}>Mai verific</button>
              {isRecap && answeredCount < sessionQuestions.length
                ? <button className="button button-primary" onClick={continueUnanswered}>Continuă cu prima întrebare lipsă <ArrowRight size={16}/></button>
                : <button className="button button-primary" onClick={finish}>Trimite acum <Send size={16} /></button>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
