import { useMemo, useState, type FormEvent } from 'react'
import {
  Ban, CheckCircle2, Download, Eye, FileText, LockKeyhole, LogOut, Mail,
  RefreshCw, Search, ShieldCheck, Trash2, Unlock, UserPlus, Users, Wifi, X,
} from 'lucide-react'
import { downloadAdmissionReport, emailAdmissionReport, type AdmissionReportData } from '../admissionReport'
import type { AdminDataApi, StudentTestReport, TestReportType } from '../adminData'
import { chapters } from '../data/catalog'
import { loadAdmissionManifest, loadAdmissionTest, normalizeAdmissionQuestions } from '../data/admission'
import { getFinalQuestions } from '../data/finalData'
import { loadRecapQuestions } from '../data/practiceData'
import type { NormalizedQuestion } from '../types'

interface AdminReportsPageProps {
  adminDataApi: AdminDataApi
}

type ReportFilter = 'all' | TestReportType

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function formatDate(value: string | null) {
  if (!value) return 'Niciodată'
  return new Intl.DateTimeFormat('ro-RO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes} min ${String(seconds % 60).padStart(2, '0')} s`
}

function reportAnswers(questions: NormalizedQuestion[], correctCount: number) {
  return Object.fromEntries(questions.map((question, index) => {
    if (index < correctCount) return [question.id, question.correctOptionId]
    return [question.id, question.options.find((option) => option.id !== question.correctOptionId)?.id ?? '']
  }))
}

async function createReportData(report: StudentTestReport): Promise<AdmissionReportData> {
  let questions: NormalizedQuestion[] = []
  if (report.type === 'final') {
    questions = getFinalQuestions(report.chapterNumber ?? 1)
  } else if (report.type === 'recap') {
    questions = await loadRecapQuestions(report.chapterNumber ?? 1)
  } else {
    const manifest = await loadAdmissionManifest()
    const entry = manifest.tests.find((test) => (report.testId && test.id === report.testId) || (test.year === report.year && test.variant === report.variant))
    if (!entry) throw new Error('Testul din arhivă nu a fost găsit.')
    questions = normalizeAdmissionQuestions(await loadAdmissionTest(entry), entry.id)
  }
  if (report.questionIds?.length) {
    const byId = new Map(questions.map((question) => [question.id, question]))
    const ordered = report.questionIds.map((id) => byId.get(id)).filter((question): question is NormalizedQuestion => Boolean(question))
    if (ordered.length) questions = ordered
  }
  const hasStoredAnswers = Boolean(report.answers && Object.keys(report.answers).length)
  const correctCount = Math.round((report.score / Math.max(1, report.total)) * questions.length)
  const chapter = chapters.find((item) => item.number === report.chapterNumber)
  const chapterReport = report.type === 'final' || report.type === 'recap'
  return {
    studentName: report.studentName,
    studentEmail: report.studentEmail,
    elapsedSeconds: report.elapsedSeconds,
    questions,
    answers: hasStoredAnswers ? report.answers! : reportAnswers(questions, correctCount),
    generatedAt: new Date(report.submittedAt),
    test: chapterReport
      ? {
          kind: report.type === 'recap' ? 'recap' : 'chapter', year: report.chapterNumber ?? 1,
          session: report.type === 'recap' ? 'Test recapitulativ' : 'Test final', variant: 'Capitol',
          economyRange: chapter?.title ?? report.testName, chapterNumber: report.chapterNumber ?? undefined,
          chapterTitle: chapter?.title ?? report.testName,
        }
      : {
          kind: 'admission', year: report.year ?? 2025, session: report.session ?? 'Admitere',
          variant: report.variant ?? 'G1', economyRange: report.economyRange ?? '51–80',
        },
  }
}

export function AdminReportsPage({ adminDataApi }: AdminReportsPageProps) {
  const { students, activity, reports, lastSync, loadError } = adminDataApi
  const [reportFilter, setReportFilter] = useState<ReportFilter>('all')
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState<StudentTestReport | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [busyReport, setBusyReport] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState('')

  const studentById = useMemo(() => new Map(students.map((student) => [student.id, student])), [students])
  const visibleReports = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('ro')
    return reports.filter((report) => (reportFilter === 'all' || report.type === reportFilter)
      && (!term || `${report.studentName} ${report.studentEmail} ${report.testName} ${report.archiveCode}`.toLocaleLowerCase('ro').includes(term)))
  }, [reports, reportFilter, search])
  const average = reports.length ? Math.round(reports.reduce((sum, report) => sum + report.score / report.total * 100, 0) / reports.length) : 0
  const onlineCount = students.filter((student) => student.isOnline).length
  const activeCount = students.filter((student) => student.status === 'active').length

  const notify = (text: string) => {
    setMessage(text)
    window.setTimeout(() => setMessage(''), 3200)
  }

  const exportReport = async (report: StudentTestReport, action: 'download' | 'email') => {
    setBusyReport(report.id)
    try {
      const data = await createReportData(report)
      if (action === 'download') {
        await downloadAdmissionReport(data)
        notify('Raportul PDF a fost generat și descărcat.')
      } else {
        const result = await emailAdmissionReport(data)
        notify(`Raportul și PDF-ul au fost trimise la ${result.recipient}.`)
      }
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Raportul nu a putut fi generat.')
    } finally {
      setBusyReport(null)
    }
  }

  const perform = async (action: () => Promise<string | null>, success: string) => {
    const error = await action()
    notify(error ?? success)
  }

  const addStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (name.trim().length < 3) return setFormError('Introdu numele complet al elevului.')
    if (!emailPattern.test(email.trim())) return setFormError('Introdu o adresă de e-mail validă.')
    const error = await adminDataApi.addStudent(name, email)
    if (error) return setFormError(error)
    setName('')
    setEmail('')
    setFormError('')
    notify('Elevul a primit acces la platformă.')
  }

  const removeStudent = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    await perform(() => adminDataApi.removeStudent(target), 'Elevul a fost eliminat din lista de acces.')
  }

  return (
    <div className="admin-report-page page-enter">
      <header className="admin-report-hero">
        <div>
          <span className="page-kicker">Administrare · acces restricționat</span>
          <h1>Rapoarte și activitate</h1>
          <p>Un singur loc pentru activitatea elevilor, rezultatele testelor și controlul accesului.</p>
        </div>
        <span className="admin-prototype-note"><ShieldCheck size={15}/> {loadError ? `Sincronizare eșuată: ${loadError}` : 'Date live · actualizare automată'}</span>
      </header>

      <section className="admin-kpi-grid" aria-label="Rezumat administrativ">
        <article><span className="admin-kpi-icon live"><Wifi size={18}/></span><div><b>{onlineCount}</b><small>elevi online acum</small></div><i>Live</i></article>
        <article><span className="admin-kpi-icon"><Users size={18}/></span><div><b>{activeCount}</b><small>conturi cu acces</small></div></article>
        <article><span className="admin-kpi-icon"><FileText size={18}/></span><div><b>{reports.length}</b><small>rapoarte generate</small></div></article>
        <article><span className="admin-kpi-icon"><CheckCircle2 size={18}/></span><div><b>{average}%</b><small>medie generală</small></div></article>
      </section>

      <section className="admin-section admin-live-section">
        <header className="admin-section-head">
          <div><span className="page-kicker">Monitorizare curentă</span><h2>Activitatea elevilor</h2><p>Starea sesiunii, testul curent și ultima interacțiune înregistrată.</p></div>
          <button className="admin-quiet-button" onClick={() => { void adminDataApi.refresh().then(() => notify('Datele au fost reîmprospătate.')) }}><RefreshCw size={14}/> Actualizează <small>{lastSync ? lastSync.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '—'}</small></button>
        </header>
        <div className="admin-table-frame">
          <div className="admin-table-scroll">
            <table className="admin-table activity-table">
              <thead><tr><th>Elev</th><th>Dispozitiv</th><th>Ultima activitate</th><th>Test curent</th><th>Progres</th><th>Începute</th><th>Finalizate</th><th>Scor</th><th>Stare</th></tr></thead>
              <tbody>{activity.map((entry) => {
                const student = studentById.get(entry.studentId)
                if (!student) return null
                return <tr key={entry.id}>
                  <td data-label="Elev"><span className="admin-person-cell"><i className={student.isOnline ? 'online' : ''}/><span><b>{student.name}</b><small>{student.email}</small></span></span></td>
                  <td data-label="Dispozitiv">{student.device}</td><td data-label="Ultima activitate">{formatDate(student.lastActivity)}</td><td data-label="Test curent"><b>{entry.currentTest}</b></td>
                  <td data-label="Progres"><span className="admin-progress"><span><i style={{ width: `${entry.progress}%` }}/></span><b>{entry.progress}%</b></span></td>
                  <td data-label="Începute">{entry.started}</td><td data-label="Finalizate">{entry.completed}</td><td data-label="Scor">{entry.score === null || entry.score === undefined ? '—' : `${entry.score}/${entry.total ?? 30}`}</td>
                  <td data-label="Stare"><span className={`admin-status ${entry.state === 'În lucru' ? 'working' : entry.state === 'Finalizat' ? 'done' : 'idle'}`}>{entry.state}</span></td>
                </tr>
              })}</tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="admin-section">
        <header className="admin-section-head reports-head">
          <div><span className="page-kicker">Arhivă evaluări</span><h2>Rapoarte teste</h2><p>Preview, PDF și trimitere pe e-mail din același tabel.</p></div>
          <span className="admin-count"><b>{visibleReports.length}</b> rapoarte afișate</span>
        </header>
        <div className="admin-report-toolbar">
          <div className="admin-tabs" role="tablist" aria-label="Tip raport">
            <button className={reportFilter === 'all' ? 'active' : ''} onClick={() => setReportFilter('all')}>Toate</button>
            <button className={reportFilter === 'final' ? 'active' : ''} onClick={() => setReportFilter('final')}>Teste finale</button>
            <button className={reportFilter === 'recap' ? 'active' : ''} onClick={() => setReportFilter('recap')}>Recapitulative</button>
            <button className={reportFilter === 'admission' ? 'active' : ''} onClick={() => setReportFilter('admission')}>Admitere</button>
          </div>
          <label className="admin-search"><Search size={15}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caută elev, test sau cod…" aria-label="Caută rapoarte"/></label>
        </div>
        <div className="admin-table-frame">
          <div className="admin-table-scroll">
            <table className="admin-table reports-table">
              <thead><tr><th>Elev</th><th>Test</th><th>Trimis</th><th>Scor</th><th>Tip</th><th>Cod</th><th>Acțiuni</th></tr></thead>
              <tbody>{visibleReports.map((report) => <tr key={report.id}>
                <td data-label="Elev"><b>{report.studentName}</b><small>{report.studentEmail}</small></td>
                <td data-label="Test"><b>{report.testName}</b><small>{formatDuration(report.elapsedSeconds)}</small></td>
                <td data-label="Trimis">{formatDate(report.submittedAt)}</td>
                <td data-label="Scor"><strong className="admin-score">{report.score}<small>/{report.total}</small></strong></td>
                <td data-label="Tip"><span className={`admin-type ${report.type}`}>{report.type === 'final' ? 'Final' : report.type === 'recap' ? 'Recapitulativ' : 'Admitere'}</span></td>
                <td data-label="Cod"><code>{report.archiveCode}</code></td>
                <td data-label="Acțiuni"><span className="admin-row-actions">
                  <button onClick={() => setPreview(report)} aria-label={`Preview ${report.testName}`}><Eye size={14}/> Preview</button>
                  <button disabled={busyReport === report.id} onClick={() => exportReport(report, 'download')} aria-label={`Descarcă PDF ${report.testName}`}><Download size={14}/> PDF</button>
                  <button disabled={busyReport === report.id} onClick={() => exportReport(report, 'email')} aria-label={`Trimite prin e-mail ${report.testName}`}><Mail size={14}/> E-mail</button>
                </span></td>
              </tr>)}</tbody>
            </table>
          </div>
          {!visibleReports.length && <div className="admin-empty">Nu există rapoarte pentru filtrul ales.</div>}
        </div>
      </section>

      <section className="admin-section access-section">
        <header className="admin-section-head">
          <div><span className="page-kicker">Control acces</span><h2>Elevi autorizați</h2><p>Doar adresele din această listă pot intra în spațiul de studiu.</p></div>
          <span className="admin-count"><LockKeyhole size={14}/><b>{students.length}</b> conturi</span>
        </header>
        <form className="admin-add-student" onSubmit={(event) => void addStudent(event)} noValidate>
          <span className="admin-add-icon"><UserPlus size={18}/></span>
          <label><span>Nume elev</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nume complet"/></label>
          <label><span>Adresă de e-mail</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="elev@exemplu.ro"/></label>
          <button type="submit"><UserPlus size={15}/> Adaugă elev</button>
          {formError && <p role="alert">{formError}</p>}
        </form>
        <div className="admin-access-toolbar">
          <span>Lista aprobată</span>
          <div><button className="danger" onClick={() => void perform(() => adminDataApi.setAllBlocked(true), 'Toți elevii au fost blocați.')}><Ban size={13}/> Blochează toți</button><button onClick={() => void perform(() => adminDataApi.setAllBlocked(false), 'Toți elevii au fost deblocați.')}><Unlock size={13}/> Deblochează toți</button></div>
        </div>
        <div className="admin-table-frame">
          <div className="admin-table-scroll">
            <table className="admin-table access-table">
              <thead><tr><th>Elev</th><th>Status</th><th>Ultima conectare</th><th>Ultima deconectare</th><th>Acțiuni</th></tr></thead>
              <tbody>{students.map((student) => <tr key={student.id}>
                <td data-label="Elev"><b>{student.name}</b><small>{student.email}</small></td>
                <td data-label="Status"><span className={`admin-access-status ${student.status}`}>{student.status === 'active' ? <CheckCircle2 size={13}/> : <Ban size={13}/>} {student.status === 'active' ? 'Activ' : 'Blocat'}</span></td>
                <td data-label="Ultima conectare">{formatDate(student.lastLogin)}</td><td data-label="Ultima deconectare">{formatDate(student.lastLogout)}</td>
                <td data-label="Acțiuni"><span className="admin-row-actions access-actions">
                  {student.status === 'active'
                    ? <button className="danger" onClick={() => void perform(() => adminDataApi.setBlocked(student.id, true), 'Elevul a fost blocat și deconectat.')}><Ban size={14}/> Blochează</button>
                    : <button onClick={() => void perform(() => adminDataApi.setBlocked(student.id, false), 'Elevul a fost deblocat.')}><Unlock size={14}/> Deblochează</button>}
                  <button disabled={!student.isOnline} onClick={() => void perform(() => adminDataApi.disconnectStudent(student.id), 'Elevul a fost deconectat.')}><LogOut size={14}/> Deconectează</button>
                  <button className="danger" onClick={() => setDeleteTarget(student.id)}><Trash2 size={14}/> Șterge</button>
                </span></td>
              </tr>)}</tbody>
            </table>
          </div>
        </div>
      </section>

      {preview && <div className="admin-modal-layer" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
        <button className="admin-modal-scrim" onClick={() => setPreview(null)} aria-label="Închide preview"/>
        <section className="admin-preview-modal">
          <header><span><Eye size={16}/> Preview raport</span><button onClick={() => setPreview(null)} aria-label="Închide"><X size={18}/></button></header>
          <div className="admin-preview-sheet">
            <span className="page-kicker">Economie by A mentor</span>
            <h2 id="report-preview-title">{preview.testName}</h2>
            <p>{preview.studentName} · {preview.studentEmail}</p>
            <div className="admin-preview-summary">
              <strong>{preview.score}<small>/{preview.total}</small></strong>
              <div><b>{Math.round(preview.score / preview.total * 100)}% răspunsuri corecte</b><span>{formatDuration(preview.elapsedSeconds)} · {formatDate(preview.submittedAt)}</span></div>
            </div>
            <div className="admin-answer-preview" aria-label="Rezumat răspunsuri">{Array.from({ length: preview.total }, (_, index) => <i key={index} className={index < preview.score ? 'correct' : 'wrong'}>{index + 1}</i>)}</div>
            <dl><div><dt>Tip evaluare</dt><dd>{preview.type === 'final' ? 'Test final de capitol' : preview.type === 'recap' ? 'Test recapitulativ' : 'Test de admitere'}</dd></div><div><dt>Cod arhivă</dt><dd>{preview.archiveCode}</dd></div></dl>
          </div>
          <footer><button onClick={() => setPreview(null)}>Închide</button><button onClick={() => exportReport(preview, 'email')}><Mail size={14}/> E-mail</button><button className="primary" onClick={() => exportReport(preview, 'download')}><Download size={14}/> Descarcă PDF</button></footer>
        </section>
      </div>}

      {deleteTarget && <div className="admin-modal-layer" role="dialog" aria-modal="true" aria-labelledby="delete-student-title">
        <button className="admin-modal-scrim" onClick={() => setDeleteTarget(null)} aria-label="Anulează ștergerea"/>
        <section className="admin-confirm-modal"><span><Trash2 size={19}/></span><h2 id="delete-student-title">Ștergi accesul elevului?</h2><p>Contul dispare din lista aprobată și nu se va mai putea conecta. Rapoartele istorice rămân în arhivă.</p><div><button onClick={() => setDeleteTarget(null)}>Anulează</button><button className="danger" onClick={() => void removeStudent()}>Șterge elevul</button></div></section>
      </div>}

      {message && <div className="admin-toast" role="status"><CheckCircle2 size={15}/>{message}</div>}
    </div>
  )
}
