import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDot,
  FunctionSquare,
  Map as MapIcon,
  Search,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { categories } from '../data/catalog'
import { loadAllLessons } from '../data/lessonData'
import type { ChapterMeta, Formula, KeyPointObject, LessonData } from '../types'
import type { SessionApi } from '../session'

interface CurriculumMapProps {
  sessionApi: SessionApi
  onNavigate: (path: string) => void
}

interface ConceptNode {
  id: string
  label: string
}

interface ChapterKnowledge {
  chapter: ChapterMeta
  concepts: ConceptNode[]
  formulas: Formula[]
  searchText: string
}

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('ro-RO')
}

function keyPointLabel(point: string | KeyPointObject) {
  if (typeof point !== 'string') return point.termen
  const [firstPart] = point.split(/[:—–]/)
  return firstPart.trim()
}

function chapterKnowledge(chapter: ChapterMeta, lesson: LessonData): ChapterKnowledge {
  const sections = lesson.teorie
  const concepts: ConceptNode[] = sections.map((section) => ({ id: section.id, label: section.titlu }))
  const knownLabels = new Set(concepts.map((concept) => normalizeSearch(concept.label)))
  const extraSlots = Math.max(0, 12 - concepts.length)
  const extraConcepts = sections
    .flatMap((section) => (section.puncteCheie ?? []).map((point) => ({ id: section.id, label: keyPointLabel(point) })))
    .filter((concept) => {
      const key = normalizeSearch(concept.label)
      if (!concept.label || knownLabels.has(key)) return false
      knownLabels.add(key)
      return true
    })
    .slice(0, extraSlots)
  const formulas = sections.flatMap((section) => section.formule ?? [])
  const allConcepts = [...concepts, ...extraConcepts]
  const searchText = normalizeSearch([
    chapter.title,
    ...allConcepts.map((concept) => concept.label),
    ...formulas.flatMap((formula) => [formula.nume, formula.formula]),
  ].join(' '))

  return { chapter, concepts: allConcepts, formulas, searchText }
}

export function CurriculumMap({ sessionApi, onNavigate }: CurriculumMapProps) {
  const activeCategory = categories.find((category) => category.chapters.some((chapter) => chapter.number === sessionApi.session.lastChapter)) ?? categories[0]
  const [expandedModules, setExpandedModules] = useState<Set<string>>(() => new Set([activeCategory.id]))
  const [expandedChapter, setExpandedChapter] = useState<number | null>(sessionApi.session.lastChapter)
  const [query, setQuery] = useState('')
  const [knowledgeByChapter, setKnowledgeByChapter] = useState<Map<number, ChapterKnowledge>>(() => new Map())
  const normalizedQuery = normalizeSearch(query.trim())
  const isReady = knowledgeByChapter.size === 19
  const conceptTotal = Array.from(knowledgeByChapter.values()).reduce((sum, item) => sum + item.concepts.length, 0)
  const formulaTotal = Array.from(knowledgeByChapter.values()).reduce((sum, item) => sum + item.formulas.length, 0)

  useEffect(() => {
    let active = true
    loadAllLessons().then((lessons) => {
      if (!active) return
      setKnowledgeByChapter(new Map(
        categories.flatMap((category) => category.chapters).map((chapter) => [chapter.number, chapterKnowledge(chapter, lessons[chapter.number])]),
      ))
    })
    return () => { active = false }
  }, [])

  const filteredCategories = useMemo(() => isReady ? categories.map((category) => ({
    ...category,
    chapters: normalizedQuery
      ? category.chapters.filter((chapter) => knowledgeByChapter.get(chapter.number)?.searchText.includes(normalizedQuery))
      : category.chapters,
  })).filter((category) => category.chapters.length > 0) : [], [isReady, knowledgeByChapter, normalizedQuery])

  const toggleModule = (categoryId: string) => {
    setExpandedModules((current) => {
      const next = new Set(current)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  const expandAll = () => setExpandedModules(new Set(categories.map((category) => category.id)))
  const collapseAll = () => {
    setExpandedModules(new Set())
    setExpandedChapter(null)
  }

  return (
    <div className="map-page mind-map-page page-enter">
      <header className="mind-map-hero">
        <div className="mind-map-hero-copy">
          <span className="page-kicker"><MapIcon size={15} /> Explorează materia</span>
          <h1>Harta materiei</h1>
          <p>Deschide modulele și capitolele pentru a vedea rapid conceptele esențiale și formulele pe care trebuie să le cunoști.</p>
        </div>
        <div className="mind-map-overview" aria-label="Conținutul hărții">
          <div><b>19</b><span>capitole</span></div>
          <div><b>{isReady ? conceptTotal : '—'}</b><span>concepte</span></div>
          <div><b>{isReady ? formulaTotal : '—'}</b><span>formule</span></div>
        </div>
      </header>

      <div className="mind-map-controls">
        <label className="mind-map-search">
          <Search size={16}/>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Caută un concept sau o formulă…" aria-label="Caută în harta materiei" />
          {query && <button onClick={() => setQuery('')} aria-label="Șterge căutarea">×</button>}
        </label>
        <div className="mind-map-control-actions">
          <button onClick={expandAll}>Extinde modulele</button>
          <button onClick={collapseAll}>Restrânge tot</button>
        </div>
      </div>

      <section className="mind-map-board" aria-label="Mind map economie">
        <div className="mind-map-root">
          <span><Sparkles size={20}/></span>
          <div><small>Materia centrală</small><b>ECONOMIE</b><em>5 module de studiu</em></div>
        </div>

        <div className="mind-map-trunk" aria-hidden="true" />
        <div className="mind-map-modules">
          {!isReady && <div className="route-loading" role="status"><span />Se construiește harta…</div>}
          {isReady && filteredCategories.map((category, categoryIndex) => {
            const moduleOpen = Boolean(normalizedQuery) || expandedModules.has(category.id)
            const completedCount = category.chapters.filter((chapter) => sessionApi.getChapterState(chapter.number).completed).length
            return (
              <section className={`mind-module ${moduleOpen ? 'is-open' : ''}`} key={category.id} style={{ '--module-color': category.color } as CSSProperties}>
                <button className="mind-module-heading" onClick={() => toggleModule(category.id)} aria-expanded={moduleOpen}>
                  <span className="mind-module-number">{String(categoryIndex + 1).padStart(2, '0')}</span>
                  <span className="mind-module-copy"><small>{category.kicker}</small><b>{category.label}</b></span>
                  <span className="mind-module-progress">{completedCount}/{category.chapters.length} parcurse</span>
                  {moduleOpen ? <ChevronDown size={18}/> : <ChevronRight size={18}/>} 
                </button>

                {moduleOpen && (
                  <div className="mind-chapter-list">
                    {category.chapters.map((chapter) => {
                      const knowledge = knowledgeByChapter.get(chapter.number)!
                      const chapterState = sessionApi.getChapterState(chapter.number)
                      const chapterOpen = Boolean(normalizedQuery) || expandedChapter === chapter.number
                      return (
                        <article className={`mind-chapter ${chapterOpen ? 'is-open' : ''}`} key={chapter.number}>
                          <button className="mind-chapter-heading" onClick={() => setExpandedChapter(chapterOpen && !normalizedQuery ? null : chapter.number)} aria-expanded={chapterOpen}>
                            <span className={`mind-chapter-index ${chapterState.completed ? 'is-complete' : ''}`}>
                              {chapterState.completed ? <Check size={15}/> : String(chapter.number).padStart(2, '0')}
                            </span>
                            <span className="mind-chapter-copy">
                              <b>{chapter.shortTitle}</b>
                              <small>{knowledge.concepts.length} concepte · {knowledge.formulas.length ? `${knowledge.formulas.length} formule` : 'fără formule'}</small>
                            </span>
                            {chapterOpen ? <ChevronDown size={17}/> : <ChevronRight size={17}/>} 
                          </button>

                          {chapterOpen && (
                            <div className="mind-chapter-knowledge">
                              <div className="mind-knowledge-section">
                                <div className="mind-knowledge-title"><CircleDot size={15}/><b>Concepte esențiale</b><span>{knowledge.concepts.length}</span></div>
                                <div className="mind-concept-cloud">
                                  {knowledge.concepts.map((concept, conceptIndex) => (
                                    <button key={`${concept.id}-${conceptIndex}`} onClick={() => onNavigate(`#/capitol/${chapter.number}?sectiune=${concept.id}`)}>
                                      {concept.label}<ArrowRight size={12}/>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {knowledge.formulas.length > 0 && (
                                <div className="mind-knowledge-section formula-section">
                                  <div className="mind-knowledge-title"><FunctionSquare size={15}/><b>Formule de reținut</b><span>{knowledge.formulas.length}</span></div>
                                  <div className="mind-formula-list">
                                    {knowledge.formulas.map((formula, formulaIndex) => (
                                      <div key={`${formula.nume}-${formulaIndex}`}><span>{formula.nume}</span><code>{formula.formula}</code></div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <button className="mind-open-lesson" onClick={() => onNavigate(`#/capitol/${chapter.number}`)}>
                                <BookOpen size={15}/> Deschide lecția completă <ArrowRight size={14}/>
                              </button>
                            </div>
                          )}
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            )
          })}

          {isReady && filteredCategories.length === 0 && (
            <div className="mind-map-empty"><Search size={22}/><b>Niciun rezultat</b><p>Încearcă un termen mai scurt, de exemplu „inflație”, „cost” sau „dobândă”.</p></div>
          )}
        </div>
      </section>
    </div>
  )
}
