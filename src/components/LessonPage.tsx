import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock3,
  Compass,
  FileQuestion,
  FlaskConical,
  Lightbulb,
  ListChecks,
  Network,
  NotebookPen,
  Sigma,
  Shapes,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { categoryInfo } from '../data/catalog'
import type { SessionApi } from '../session'
import type { ChapterMeta, Classification, ClassificationCategory, LessonData, TheorySection } from '../types'
import { InlineMultipleChoice, MatchingCard, NumericCard, TrueFalseCard } from './LessonExercises'
import { TheoryWidget } from './TheoryWidgets'
import { ChapterExplorer } from './ChapterExplorer'

interface LessonPageProps {
  lesson: LessonData
  chapterMeta: ChapterMeta
  initialSection?: string
  sessionApi: SessionApi
  onNavigate: (path: string) => void
  onOpenNotes: () => void
}

const sectionIcons = [Compass, CircleDot, Network, BrainCircuit, BookOpenCheck, Sigma]

function ClassificationAtlas({ sectionId, classification, index }: { sectionId: string; classification: Classification; index: number }) {
  if (!classification) return null
  const headingId = `classification-${sectionId}-${index}`
  const isLongList = classification.orientare === 'vertical' || classification.categorii.length > 4

  return (
    <section className="classification-block" aria-labelledby={headingId}>
      <header className="classification-header">
        <div className="classification-heading">
          <span className="classification-symbol"><Shapes size={19} /></span>
          <div>
            <span className="micro-label">Schemă de clasificare</span>
            <h5 id={headingId}>{classification.criteriu}</h5>
          </div>
        </div>
        <span className="classification-count"><b>{classification.categorii.length}</b> categorii</span>
      </header>

      <ol className={`classification-grid ${isLongList ? 'is-list' : ''}`}>
        {classification.categorii.map((category, categoryIndex) => {
          const objectCategory = typeof category === 'object' ? category as ClassificationCategory : null
          const categoryName = objectCategory?.nume ?? (category as string)
          return (
            <li className="classification-item" data-tone={categoryIndex % 4} key={`${sectionId}-${index}-${categoryIndex}`}>
              <span className="classification-number">{String(categoryIndex + 1).padStart(2, '0')}</span>
              <div className="classification-copy">
                <b>{categoryName}</b>
                {objectCategory?.definitie && <p>{objectCategory.definitie}</p>}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function TheoryCard({ section, index, completed, onToggle }: { section: TheorySection; index: number; completed: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState(true)
  const Icon = sectionIcons[index % sectionIcons.length]

  return (
    <article id={`section-${section.id}`} className={`theory-card ${completed ? 'is-complete' : ''}`}>
      <span id={`sect-${section.id}`} className="section-anchor" aria-hidden="true" />
      <button className="theory-card-header" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className="theory-icon"><Icon size={20} /></span>
        <span className="theory-title"><small>Concept {section.nr}</small><strong>{section.titlu}</strong></span>
        {completed && <span className="section-done"><Check size={14} /> Parcurs</span>}
        <ChevronDown className={open ? 'rotate' : ''} size={20} />
      </button>
      {open && (
        <div className="theory-card-body">
          <div className="reading-copy">
            {section.text.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
          </div>

          {section.puncteCheie && section.puncteCheie.length > 0 && (
            <div className="key-points">
              <span className="micro-label"><Sparkles size={13} /> De reținut</span>
              <div className="key-point-grid">
                {section.puncteCheie.map((point, pointIndex) => (
                  <div className="key-point" key={pointIndex}>
                    <span>{String(pointIndex + 1).padStart(2, '0')}</span>
                    <div><b>{typeof point === 'string' ? point : point.termen}</b>{typeof point !== 'string' && <p>{point.descriere}</p>}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section.clasificari && section.clasificari.length > 0 && (
            <div className="classifications-layout">
              {section.clasificari.map((classification, classificationIndex) => (
                <ClassificationAtlas key={classificationIndex} sectionId={section.id} classification={classification} index={classificationIndex} />
              ))}
            </div>
          )}

          {section.exemple?.map((example, exampleIndex) => (
            <aside className="example-callout" key={exampleIndex}>
              <span><Lightbulb size={17} /></span><div><b>Exemplu</b><p>{example}</p></div>
            </aside>
          ))}

          {section.formule && section.formule.length > 0 && (
            <div className="formula-grid">
              {section.formule.map((formula) => (
                <div className="formula-card" key={formula.nume}>
                  <span>{formula.nume}</span><code>{formula.formula}</code>
                </div>
              ))}
            </div>
          )}

          <TheoryWidget calculator={section.calculator} diagram={section.diagrama} />

          {section.notaLegatura && <a className="connection-note" href={section.notaLegatura.href}><Network size={16} /> {section.notaLegatura.text}</a>}

          <div className="section-completion">
            <span>{completed ? 'Ai marcat această secțiune ca parcursă.' : 'Ai înțeles ideile principale?'}</span>
            <button className={`button ${completed ? 'button-completed' : 'button-ghost'}`} onClick={onToggle}>
              <CheckCircle2 size={17} /> {completed ? 'Secțiune parcursă' : 'Marchează ca parcursă'}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

type LabTab = 'grila' | 'af' | 'probleme' | 'asociere'

export function LessonPage({ lesson, chapterMeta, initialSection, sessionApi, onNavigate, onOpenNotes }: LessonPageProps) {
  const { toggleSection, completeActivity, setLastVisitedSection } = sessionApi
  const chapterNumber = lesson.capitol.numar
  const chapterState = sessionApi.getChapterState(chapterNumber)
  const [activeSection, setActiveSection] = useState(initialSection ?? chapterState.lastVisitedSection ?? lesson.teorie[0].id)
  const availableTabs: LabTab[] = [
    ...(lesson.grila.length ? ['grila' as const] : []),
    ...(lesson.af.length ? ['af' as const] : []),
    ...(lesson.probleme.length ? ['probleme' as const] : []),
    ...(lesson.asociere.length ? ['asociere' as const] : []),
  ]
  const [labTab, setLabTab] = useState<LabTab>(availableTabs[0] ?? 'grila')
  const activityTypeCount = [lesson.grila, lesson.af, lesson.probleme, lesson.asociere].filter((items) => items.length > 0).length

  useEffect(() => {
    if (!initialSection) return
    window.setTimeout(() => document.getElementById(`section-${initialSection}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [initialSection])

  const goToSection = (id: string) => {
    setActiveSection(id)
    setLastVisitedSection(chapterNumber, id)
    document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const activityDone = (id: string) => chapterState.completedActivities.includes(id)

  return (
    <div className="lesson-page page-enter">
      <div className="lesson-topbar">
        <button className="back-button" onClick={() => onNavigate('#/lectii')}><ArrowLeft size={18} /> Toate lecțiile</button>
        <button className={`lesson-manual-status ${chapterState.completed ? 'is-complete' : ''}`} onClick={() => sessionApi.toggleChapterCompletion(chapterNumber)}><Check size={15}/> {chapterState.completed ? 'Parcurs' : 'Marchează parcurs'}</button>
        <button className="notes-button" onClick={onOpenNotes}><NotebookPen size={17} /> Notițe</button>
      </div>

      <header className="lesson-hero">
        <div className="lesson-hero-copy">
          <span className="chapter-label">Capitolul {String(chapterNumber).padStart(2, '0')} · {categoryInfo[chapterMeta.category].label}</span>
          <h1>{lesson.capitol.titlu}</h1>
          <p>{lesson.capitol.obiective[0] ?? 'Înțelege conceptele capitolului și aplică-le în contexte economice concrete.'}</p>
          <div className="lesson-meta"><span><Clock3 size={15} /> {chapterMeta.duration} minute</span><span><ListChecks size={15} /> {lesson.teorie.length} concepte</span><span><FlaskConical size={15} /> {activityTypeCount} tipuri de activități</span></div>
        </div>
      </header>

      <section className="objectives-panel">
        <div className="objectives-heading"><span><TargetIcon /></span><div><small>Obiective</small><h2>Ce vei învăța</h2></div></div>
        <div className="objectives-grid">
          {lesson.capitol.obiective.map((objective, index) => <div key={objective}><span>{index + 1}</span><p>{objective}</p></div>)}
        </div>
      </section>

      <div className="lesson-layout">
        <aside className="lesson-toc">
          <span className="micro-label">În această lecție</span>
          <nav>
            {lesson.teorie.map((section) => (
              <button key={section.id} className={activeSection === section.id ? 'active' : ''} onClick={() => goToSection(section.id)}>
                <span>{chapterState.completedSections.includes(section.id) ? <Check size={13} /> : section.nr}</span>{section.titlu}
              </button>
            ))}
          </nav>
          <button className="toc-lab-button" onClick={() => document.getElementById('laborator')?.scrollIntoView({ behavior: 'smooth' })}><FlaskConical size={16} /> Laborator practic</button>
          <button className="toc-test-button" onClick={() => onNavigate(`#/capitol/${chapterNumber}/test-final`)}><FileQuestion size={16} /> Test final</button>
        </aside>

        <main className="lesson-content">
          <div className="content-intro"><span className="page-kicker">Partea I</span><h2>Conceptele de bază</h2><p>Explicații, exemple și instrumente interactive.</p></div>
          {lesson.teorie.map((section, index) => (
            <TheoryCard
              key={section.id}
              section={section}
              index={index}
              completed={chapterState.completedSections.includes(section.id)}
              onToggle={() => toggleSection(chapterNumber, section.id)}
            />
          ))}

          <div id="laborator" className="content-intro lab-intro"><span className="page-kicker">Partea II</span><h2>Laborator practic</h2><p>Aplică ideile și verifică imediat fiecare răspuns.</p></div>
          <div className="lab-tabs" role="tablist" aria-label="Tipuri de exerciții">
            {lesson.grila.length > 0 && <button className={labTab === 'grila' ? 'active' : ''} onClick={() => setLabTab('grila')}><ListChecks size={16} /> Grile <span>{lesson.grila.length}</span></button>}
            {lesson.af.length > 0 && <button className={labTab === 'af' ? 'active' : ''} onClick={() => setLabTab('af')}><CheckCircle2 size={16} /> Adevărat / Fals <span>{lesson.af.length}</span></button>}
            {lesson.probleme.length > 0 && <button className={labTab === 'probleme' ? 'active' : ''} onClick={() => setLabTab('probleme')}><Sigma size={16} /> Probleme <span>{lesson.probleme.length}</span></button>}
            {lesson.asociere.length > 0 && <button className={labTab === 'asociere' ? 'active' : ''} onClick={() => setLabTab('asociere')}><Network size={16} /> Asociere <span>{lesson.asociere.length}</span></button>}
          </div>

          <div className="exercise-stack">
            {labTab === 'grila' && lesson.grila.map((item, index) => <InlineMultipleChoice key={index} item={item} index={index} activityId={`inline-grila-${index}`} completed={activityDone(`inline-grila-${index}`)} onComplete={(id) => completeActivity(chapterNumber, id)} />)}
            {labTab === 'af' && lesson.af.map((item, index) => <TrueFalseCard key={index} item={item} index={index} activityId={`inline-af-${index}`} completed={activityDone(`inline-af-${index}`)} onComplete={(id) => completeActivity(chapterNumber, id)} />)}
            {labTab === 'probleme' && lesson.probleme.map((item, index) => <NumericCard key={index} item={item} index={index} activityId={`inline-problema-${index}`} completed={activityDone(`inline-problema-${index}`)} onComplete={(id) => completeActivity(chapterNumber, id)} />)}
            {labTab === 'asociere' && lesson.asociere.map((item, index) => <MatchingCard key={index} item={item} activityId={`inline-asociere-${index}`} completed={activityDone(`inline-asociere-${index}`)} onComplete={(id) => completeActivity(chapterNumber, id)} />)}
          </div>

          <ChapterExplorer chapter={chapterNumber} />

          <section className="lesson-finale">
            <div><span className="page-kicker">Când te simți pregătit</span><h2>Verifică ce ai înțeles.</h2><p>Testul final conține 30 de întrebări și îți arată explicațiile doar după trimitere.</p></div>
            <button className={`button lesson-status-toggle ${chapterState.completed ? 'is-complete' : ''}`} onClick={() => sessionApi.toggleChapterCompletion(chapterNumber)}><CheckCircle2 size={17}/> {chapterState.completed ? 'Lecție parcursă' : 'Marchează lecția parcursă'}</button>
            <button className="button button-light" onClick={() => onNavigate(`#/capitol/${chapterNumber}/test-final`)}>Începe testul final <ArrowRight size={18} /></button>
          </section>
        </main>
      </div>
    </div>
  )
}

function TargetIcon() {
  return <svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="12" /><circle cx="18" cy="18" r="5" /><path d="M22 14 31 5M26 5h5v5" /></svg>
}
