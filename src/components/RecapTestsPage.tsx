import { ArrowRight, Check, ClipboardCheck, Clock3, Layers3, LockKeyhole, Sparkles } from 'lucide-react'
import { categories, categoryInfo } from '../data/catalog'
import { practiceQuestionCount } from '../data/courseMeta'
import { isDemoChapter } from '../demoAccess'
import type { SessionApi } from '../session'

interface RecapTestsPageProps {
  sessionApi: SessionApi
  onNavigate: (path: string) => void
  isDemo?: boolean
}

export function RecapTestsPage({ sessionApi, onNavigate, isDemo = false }: RecapTestsPageProps) {
  return (
    <div className="recap-page page-enter">
      <header className="recap-hero">
        <div className="recap-hero-copy">
          <span className="page-kicker"><Sparkles size={14}/> Evaluare separată</span>
          <h1>Teste recapitulative</h1>
          <p>Consolidează fiecare capitol printr-un test complet. Răspunsurile corecte și explicațiile originale devin vizibile numai după ce trimiți testul.</p>
          <div className="recap-facts">
            <span><Layers3 size={16}/><b>19</b> teste</span>
            <span><ClipboardCheck size={16}/><b>760</b> întrebări</span>
            <span><Clock3 size={16}/><b>40</b> întrebări/test</span>
          </div>
        </div>
      </header>

      <div className="recap-modules">
        {categories.map((category, moduleIndex) => (
          <section className="recap-module" key={category.id}>
            <header>
              <span style={{ background: categoryInfo[category.id].color }}>{String(moduleIndex + 1).padStart(2, '0')}</span>
              <div><h2>{category.label}</h2><p>{category.kicker}</p></div>
            </header>
            <div className="recap-test-grid">
              {category.chapters.map((chapter) => {
                const completed = sessionApi.session.completedRecapTests.includes(chapter.number)
                const demoLocked = isDemo && !isDemoChapter(chapter.number)
                return (
                  <article className={`recap-test-card ${completed ? 'completed' : ''} ${demoLocked ? 'is-demo-locked' : ''}`} key={chapter.number}>
                    <span className="recap-test-number">Capitolul {String(chapter.number).padStart(2, '0')}{demoLocked && <i className="demo-lock-badge"><LockKeyhole size={10}/> Demo</i>}</span>
                    <strong>{chapter.title}</strong>
                    <span className="recap-test-meta"><span><ClipboardCheck size={14}/> {practiceQuestionCount} întrebări</span><span><Clock3 size={14}/> 45–60 min</span></span>
                    <div className="recap-test-action">
                      <button className={`recap-manual-toggle ${completed ? 'is-complete' : ''}`} disabled={demoLocked} onClick={() => sessionApi.toggleRecapCompletion(chapter.number)}>{demoLocked ? <LockKeyhole size={14}/> : <Check size={14}/>} {demoLocked ? 'Blocat' : completed ? 'Parcurs' : 'Neparcurs'}</button>
                      <button className="recap-open-button" aria-label={demoLocked ? `Blocat în Demo: testul capitolului ${chapter.number}` : undefined} onClick={() => onNavigate(`#/teste-recapitulative/capitol/${chapter.number}`)}>{demoLocked ? <><LockKeyhole size={14}/> Disponibil cu cont</> : <>Deschide testul <ArrowRight size={16}/></>}</button>
                    </div>
                    {completed && <span className="recap-complete-mark"><Check size={14}/></span>}
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
