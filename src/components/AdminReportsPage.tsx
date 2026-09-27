import { useMemo, useState, type FormEvent } from 'react'
import {
  Ban, CheckCircle2, Database, Download, Eye, FileText, HardDrive, LockKeyhole, LogOut, Mail,
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

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
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
  const { students, activity, reports, lastSync, loadError, usage, usageError } = adminDataApi
  const [selectedReports, setSelectedReports] = useState<string[]>([])
  const [reportDeleteTarget, setReportDeleteTarget] = useState<string[] | null>(null)
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

  const visibleIds = visibleReports.map((report) => report.id)
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedReports.includes(id))
  const toggleReport = (id: string) => setSelectedReports((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])
  const toggleAllVisible = () => setSelectedReports((current) => allVisibleSelected
    ? current.filter((id) => !visibleIds.includes(id))
    : Array.from(new Set([...current, ...visibleIds])))

  const confirmDeleteReports = async () => {
    if (!reportDeleteTarget) return
    const ids = reportDeleteTarget
    setReportDeleteTarget(null)
    const error = await adminDataApi.deleteReports(ids)
    if (!error) setSelectedReports((current) => current.filter((id) => !ids.includes(id)))
    notify(error ?? (ids.length === 1 ? 'Raportul a fost șters.' : `${ids.length} rapoarte au fost șterse.`))
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

      <section className="admin-section admin-usage-section" aria-labelledby="usage-title">
        <header className="admin-section-head">
          <div><span className="page-kicker">Supabase · plan gratuit</span><h2 id="usage-title">Spațiu folosit</h2><p>Tot ce ocupă proiectul Supabase al economiei: rapoarte, documente, elevi și sistem. Șterge rapoartele vechi ca să eliberezi spațiu.</p></div>
          <button className="admin-quiet-button" onClick={() => { void adminDataApi.refreshUsage().then(() => notify('Utilizarea a fost recalculată.')) }}><RefreshCw size={14}/> Recalculează <small>{usage ? new Date(usage.measuredAt).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '—'}</small></button>
        </header>
        {usageError && <div className="admin-empty" role="alert">{usageError}</div>}
        {usage?.total && (() => {
          const total = usage.total
          const level = total.percent >= 90 ? 'danger' : total.percent >= 70 ? 'warning' : 'ok'
          return <article className={`admin-usage-card admin-usage-total ${level}`}>
            <header><span className="admin-kpi-icon"><Database size={18}/></span><div><b>Tot spațiul ocupat în Supabase</b><small>bază de date + fișiere · aceeași măsurătoare ca la logică</small></div><strong>{total.percent.toFixed(1)}%</strong></header>
            <div className="admin-usage-bar" role="progressbar" aria-label="Spațiu Supabase total folosit" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(total.percent)}><i style={{ width: `${Math.min(100, Math.max(1, total.percent))}%` }}/></div>
            <p><b>{formatBytes(total.usedBytes)}</b> din {formatBytes(total.limitBytes)} · mai ai <b>{formatBytes(total.remainingBytes)}</b></p>
            <div className="admin-usage-stack" role="img" aria-label="Împărțirea spațiului pe categorii">{total.categories.filter((category) => category.bytes > 0).map((category) => <i key={category.key} data-category={category.key} style={{ width: `${Math.max(1, category.sharePercent)}%` }} title={`${category.label}: ${category.sharePercent.toFixed(1)}%`}/>)}</div>
            <ul className="admin-usage-categories">{total.categories.map((category) => <li key={category.key} data-category={category.key}><i aria-hidden="true"/><span>{category.label}{category.files > 0 && <small> · {category.files} fișiere</small>}</span><b>{formatBytes(category.bytes)}</b><strong>{category.sharePercent.toFixed(1)}%</strong></li>)}</ul>
            <p className="admin-usage-note">{total.exactCategories ? '„Sistem Supabase” e spațiul de bază al oricărei baze de date, ocupat chiar și fără date.' : 'Împărțire estimată: rulează migrarea 20260927_supabase_total_usage.sql în Supabase pentru cifre exacte.'}</p>
          </article>
        })()}
        {usage && <div className="admin-usage-grid">
          {([
            { key: 'db', icon: <Database size={18}/>, title: 'Bază de date', meter: usage.database, detail: `${usage.database.rows} rânduri` },
            { key: 'storage', icon: <HardDrive size={18}/>, title: 'Fișiere (manuale PDF)', meter: usage.storage, detail: `${usage.storage.files} fișiere` },
          ]).map((item) => {
            const level = item.meter.percent >= 90 ? 'danger' : item.meter.percent >= 70 ? 'warning' : 'ok'
            return <article key={item.key} className={`admin-usage-card ${level}`}>
              <header><span className="admin-kpi-icon">{item.icon}</span><div><b>{item.title}</b><small>{item.detail}</small></div><strong>{item.meter.percent.toFixed(1)}%</strong></header>
              <div className="admin-usage-bar" role="progressbar" aria-label={`${item.title} folosit`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(item.meter.percent)}><i style={{ width: `${Math.min(100, Math.max(1, item.meter.percent))}%` }}/></div>
              <p><b>{formatBytes(item.meter.usedBytes)}</b> din {formatBytes(item.meter.limitBytes)} · mai ai <b>{formatBytes(item.meter.remainingBytes)}</b></p>
            </article>
          })}
          <article className="admin-usage-card tables">
            <header><div><b>Pe tabele</b><small>date active</small></div></header>
            <ul>{usage.tables.map((table) => <li key={table.name}><span>{table.label}</span><small>{table.rows} rânduri</small><b>{formatBytes(table.bytes)}</b></li>)}</ul>
          </article>
        </div>}
      </section>

      <section className="admin-section admin-live-section">
        <header className="admin-section-head">
          <div><span className="page-kicker">Monitorizare curentă</span><h2>Activitatea elevilor</h2><p>Starea sesiunii, testul curent și ultima interacțiune înregistrată.</p></div>
          <div className="admin-head-actions"><button className="admin-quiet-button" onClick={() => void perform(() => adminDataApi.clearFinishedActivity(), 'Activitățile finalizate au fost curățate.')}><Trash2 size={14}/> Curăță finalizate</button>
          <button className="admin-quiet-button" onClick={() => { void adminDataApi.refresh().then(() => notify('Datele au fost reîmprospătate.')) }}><RefreshCw size={14}/> Actualizează <small>{lastSync ? lastSync.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' }) : '—'}</small></button></div>
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
          {selectedReports.length > 0 && <button className="admin-quiet-button danger" onClick={() => setReportDeleteTarget(selectedReports)}><Trash2 size={14}/> Șterge selectate ({selectedReports.length})</button>}
          <label className="admin-search"><Search size={15}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Caută elev, test sau cod…" aria-label="Caută rapoarte"/></label>
        </div>
        <div className="admin-table-frame">
          <div className="admin-table-scroll">
            <table className="admin-table reports-table">
              <thead><tr><th className="admin-check-cell"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} aria-label="Selectează toate rapoartele afișate"/></th><th>Elev</th><th>Test</th><th>Trimis</th><th>Scor</th><th>Tip</th><th>Cod</th><th>Acțiuni</th></tr></thead>
              <tbody>{visibleReports.map((report) => <tr key={report.id} className={selectedReports.includes(report.id) ? 'is-selected' : ''}>
                <td className="admin-check-cell"><input type="checkbox" checked={selectedReports.includes(report.id)} onChange={() => toggleReport(report.id)} aria-label={`Selectează ${report.testName} · ${report.studentName}`}/></td>
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
                  <button className="danger" onClick={() => setReportDeleteTarget([report.id])} aria-label={`Șterge ${report.testName}`}><Trash2 size={14}/> Șterge</button>
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

      {reportDeleteTarget && <div className="admin-modal-layer" role="dialog" aria-modal="true" aria-labelledby="delete-report-title">
        <button className="admin-modal-scrim" onClick={() => setReportDeleteTarget(null)} aria-label="Anulează ștergerea"/>
        <section className="admin-confirm-modal"><span><Trash2 size={19}/></span><h2 id="delete-report-title">{reportDeleteTarget.length === 1 ? 'Ștergi raportul?' : `Ștergi ${reportDeleteTarget.length} rapoarte?`}</h2><p>Rezultatele și răspunsurile se șterg definitiv din baza de date. Descarcă PDF-ul înainte, dacă vrei să-l păstrezi.</p><div><button onClick={() => setReportDeleteTarget(null)}>Anulează</button><button className="danger" onClick={() => void confirmDeleteReports()}>Șterge definitiv</button></div></section>
      </div>}

      {deleteTarget && <div className="admin-modal-layer" role="dialog" aria-modal="true" aria-labelledby="delete-student-title">
        <button className="admin-modal-scrim" onClick={() => setDeleteTarget(null)} aria-label="Anulează ștergerea"/>
        <section className="admin-confirm-modal"><span><Trash2 size={19}/></span><h2 id="delete-student-title">Ștergi accesul elevului?</h2><p>Contul dispare din lista aprobată și nu se va mai putea conecta. Rapoartele istorice rămân în arhivă.</p><div><button onClick={() => setDeleteTarget(null)}>Anulează</button><button className="danger" onClick={() => void removeStudent()}>Șterge elevul</button></div></section>
      </div>}

      {message && <div className="admin-toast" role="status"><CheckCircle2 size={15}/>{message}</div>}
    </div>
  )
}
