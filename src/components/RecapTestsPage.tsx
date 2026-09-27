import { ArrowRight, Check, ClipboardCheck, Clock3, Layers3, Sparkles } from 'lucide-react'
import { categories, categoryInfo } from '../data/catalog'
import { practiceQuestionCount } from '../data/courseMeta'
import type { SessionApi } from '../session'

interface RecapTestsPageProps {
  sessionApi: SessionApi
  onNavigate: (path: string) => void
}

export function RecapTestsPage({ sessionApi, onNavigate }: RecapTestsPageProps) {
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
                return (
                  <article className={`recap-test-card ${completed ? 'completed' : ''}`} key={chapter.number}>
                    <span className="recap-test-number">Capitolul {String(chapter.number).padStart(2, '0')}</span>
                    <strong>{chapter.title}</strong>
                    <span className="recap-test-meta"><span><ClipboardCheck size={14}/> {practiceQuestionCount} întrebări</span><span><Clock3 size={14}/> 45–60 min</span></span>
                    <div className="recap-test-action">
                      <button className={`recap-manual-toggle ${completed ? 'is-complete' : ''}`} onClick={() => sessionApi.toggleRecapCompletion(chapter.number)}><Check size={14}/> {completed ? 'Parcurs' : 'Neparcurs'}</button>
                      <button className="recap-open-button" onClick={() => onNavigate(`#/teste-recapitulative/capitol/${chapter.number}`)}>Deschide testul <ArrowRight size={16}/></button>
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
