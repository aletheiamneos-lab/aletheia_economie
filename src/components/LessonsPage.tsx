import { ArrowRight, BookMarked, BookOpenText, BrainCircuit, ChartNoAxesCombined, Check, ClipboardCheck, Clock3, Compass, Globe2, Landmark, Layers3, LockKeyhole, Store } from 'lucide-react'
import { categories } from '../data/catalog'
import { chapterObjectives, finalQuestionCount, practiceQuestionCount } from '../data/courseMeta'
import { isDemoChapter } from '../demoAccess'
import type { SessionApi } from '../session'

interface LessonsPageProps {
  sessionApi: SessionApi
  onNavigate: (path: string) => void
  isDemo?: boolean
}

const moduleIcons = [Compass, Store, Landmark, ChartNoAxesCombined, Globe2]

function LessonAction({
  tone,
  label,
  tooltip,
  tooltipId,
  onClick,
  icon: Icon,
  locked = false,
}: {
  tone: 'theory' | 'practice' | 'final'
  label: string
  tooltip: string
  tooltipId: string
  onClick: () => void
  icon: typeof BookOpenText
  locked?: boolean
}) {
  return (
    <span className="lesson-list-action">
      <button className={`${tone} ${locked ? 'is-demo-action-locked' : ''}`} onClick={onClick} aria-describedby={tooltipId}>{locked ? <LockKeyhole size={15}/> : <Icon size={16}/>}<span>{locked ? `${label} · Demo` : label}</span>{locked ? <LockKeyhole size={12}/> : <ArrowRight size={14}/>}</button>
      <span className="lesson-action-tooltip" role="tooltip" id={tooltipId}><b>{label}</b><small>{tooltip}</small></span>
    </span>
  )
}

export function LessonsPage({ sessionApi, onNavigate, isDemo = false }: LessonsPageProps) {
  return (
    <div className="lessons-page page-enter">
      <header className="lessons-hero">
        <div>
          <span className="page-kicker"><BookOpenText size={15}/> Biblioteca cursului</span>
          <h1>Lecții</h1>
          <p>Alege capitolul și deschide direct teoria, practica sau testul final.</p>
        </div>
        <div className="lessons-hero-facts">
          <span><b>19</b> capitole</span>
          <span><b>5</b> module</span>
          <span><b>3</b> activități / capitol</span>
        </div>
      </header>

      <div className="lessons-catalogue">
        {categories.map((category, categoryIndex) => {
          const ModuleIcon = moduleIcons[categoryIndex] ?? Layers3
          return (
            <section className="lessons-module" key={category.id} style={{ '--lesson-accent': category.color } as React.CSSProperties}>
              <header className="lessons-module-heading">
                <span className="lessons-module-symbol"><ModuleIcon size={22}/><small>0{categoryIndex + 1}</small></span>
                <div>
                  <span className="lessons-module-index">Modulul 0{categoryIndex + 1}</span>
                  <h2>{category.label}</h2>
                  <p>{category.kicker} · {category.chapters.length} {category.chapters.length === 1 ? 'capitol' : 'capitole'}</p>
                </div>
                <Layers3 size={20}/>
              </header>

            <div className="lessons-list">
              {category.chapters.map((chapter) => {
                const completed = sessionApi.getChapterState(chapter.number).completed
                const demoLocked = isDemo && !isDemoChapter(chapter.number)
                return (
                  <article className={`lesson-list-row ${completed ? 'completed' : ''} ${demoLocked ? 'is-demo-locked' : ''}`} key={chapter.number}>
                    <div className="lesson-list-number">{String(chapter.number).padStart(2, '0')}</div>
                    <div className="lesson-list-content">
                      <div className="lesson-list-tags">
                        <span><BookMarked size={11}/> Capitolul {chapter.number}</span>
                        <span><BrainCircuit size={11}/> Teorie + practică</span>
                        {demoLocked && <span className="demo-lock-badge"><LockKeyhole size={10}/> Demo</span>}
                        {completed && <span className="completed"><Check size={11}/> Parcurs</span>}
                      </div>
                      <h3>{chapter.title}</h3>
                      <p>{chapterObjectives[chapter.number] ?? 'Concepte, exemple și aplicații pentru fixarea materiei.'}</p>
                      <div className="lesson-list-details">
                        <span><Clock3 size={13}/> {chapter.duration} min teorie</span>
                        <span><BrainCircuit size={13}/> {practiceQuestionCount} întrebări de practică</span>
                        <span><ClipboardCheck size={13}/> {finalQuestionCount} întrebări la test</span>
                      </div>
                    </div>
                    <div className="lesson-list-actions" aria-label={`Acțiuni pentru capitolul ${chapter.number}`}>
                      <LessonAction tone="theory" label="Teorie" locked={demoLocked} tooltipId={`lesson-${chapter.number}-theory-tip`} tooltip="Explicații, exemple și formulele capitolului." icon={BookOpenText} onClick={() => onNavigate(`#/capitol/${chapter.number}`)}/>
                      <LessonAction tone="practice" label="Practică" locked={demoLocked} tooltipId={`lesson-${chapter.number}-practice-tip`} tooltip="Întrebări cu feedback și rezolvare imediată." icon={BrainCircuit} onClick={() => onNavigate(`#/capitol/${chapter.number}/antrenament`)}/>
                      <LessonAction tone="final" label="Test final" locked={demoLocked} tooltipId={`lesson-${chapter.number}-final-tip`} tooltip="Evaluare completă; răspunsurile apar după trimitere." icon={ClipboardCheck} onClick={() => onNavigate(`#/capitol/${chapter.number}/test-final`)}/>
                    </div>
                  </article>
                )
              })}
            </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
