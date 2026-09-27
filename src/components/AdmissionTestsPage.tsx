import { ArrowRight, BookOpenCheck, CalendarDays, FileCheck2, GraduationCap, LockKeyhole, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { loadAdmissionManifest, type AdmissionManifest, type AdmissionTestEntry } from '../data/admission'
import { DEMO_ADMISSION_TEST_ID } from '../demoAccess'

interface AdmissionTestsPageProps {
  onNavigate: (path: string) => void
  isDemo?: boolean
}

const difficultyOrder = ['usor', 'mediu', 'greu', 'foarte_greu'] as const
const difficultyLabels = { usor: 'Ușor', mediu: 'Mediu', greu: 'Greu', foarte_greu: 'Foarte greu' }

function AdmissionCard({ test, onOpen, locked = false }: { test: AdmissionTestEntry; onOpen: () => void; locked?: boolean }) {
  return (
    <article className={`admission-test-card ${locked ? 'is-demo-locked' : ''}`}>
      <div className="admission-test-card-top">
        <span className="admission-variant">{test.variant}</span>
        <span>{test.year}{locked && <i className="demo-lock-badge"><LockKeyhole size={10}/> Demo</i>}</span>
      </div>
      <h3>{test.session}</h3>
      <p>Întrebările de economie {test.economyRange}</p>
      <div className="admission-difficulty-bar" aria-label="Distribuția dificultății">
        {difficultyOrder.map((difficulty) => {
          const count = test.difficultyCounts[difficulty] ?? 0
          return count > 0 ? <i key={difficulty} className={difficulty} style={{ flexGrow: count }} title={`${difficultyLabels[difficulty]}: ${count}`} /> : null
        })}
      </div>
      <div className="admission-card-meta">
        <span><FileCheck2 size={14}/><b>{test.questionCount}</b> întrebări</span>
        <span><BookOpenCheck size={14}/> răspunsuri și rezolvări</span>
      </div>
      <button className="admission-open-button" aria-label={locked ? `Blocat în Demo: ${test.session} ${test.variant}` : undefined} onClick={onOpen}>{locked ? <><LockKeyhole size={14}/> Disponibil cu cont</> : <>Deschide testul <ArrowRight size={16}/></>}</button>
    </article>
  )
}

export function AdmissionTestsPage({ onNavigate, isDemo = false }: AdmissionTestsPageProps) {
  const [manifest, setManifest] = useState<AdmissionManifest | null>(null)
  const [variant, setVariant] = useState('toate')
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    loadAdmissionManifest(controller.signal).then(setManifest).catch((reason: unknown) => {
      if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : 'Catalog invalid.')
    })
    return () => controller.abort()
  }, [])

  const visibleTests = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('ro')
    return (manifest?.tests ?? []).filter((test) => {
      const matchesVariant = variant === 'toate' || test.variant.toLowerCase() === variant
      const matchesQuery = !normalizedQuery || `${test.year} ${test.session} ${test.variant}`.toLocaleLowerCase('ro').includes(normalizedQuery)
      return matchesVariant && matchesQuery
    })
  }, [manifest, query, variant])

  const years = [...new Set(visibleTests.map((test) => test.year))].sort((left, right) => right - left)

  return (
    <div className="admission-page page-enter">
      <header className="admission-hero">
        <div>
          <span className="page-kicker"><GraduationCap size={15}/> Pregătire pentru concurs</span>
          <h1>Teste de admitere</h1>
          <p>Subiecte reale de economie, organizate pe sesiuni și variante. Răspunsurile corecte, formulele și rezolvările devin vizibile numai după trimiterea testului.</p>
          <div className="admission-hero-facts">
            <span><b>{manifest?.testCount ?? '—'}</b> teste</span>
            <span><b>{manifest?.totalQuestions.toLocaleString('ro-RO') ?? '—'}</b> întrebări</span>
            <span><b>{manifest ? `${manifest.yearRange[0]}–${manifest.yearRange[1]}` : '—'}</b> arhivă</span>
          </div>
        </div>
        <div className="admission-hero-mark"><span>AD</span><b>ECONOMIE</b><small>antrenament complet</small></div>
      </header>

      <section className="admission-filter-bar" aria-label="Filtre teste de admitere">
        <label><Search size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Caută după an sau sesiune" aria-label="Caută test de admitere"/></label>
        <div className="admission-variant-filter" role="group" aria-label="Filtrează după variantă">
          {['toate', 'g1', 'g2', 'g3', 'g4'].map((item) => <button key={item} className={variant === item ? 'active' : ''} onClick={() => setVariant(item)}>{item === 'toate' ? 'Toate' : item.toUpperCase()}</button>)}
        </div>
      </section>

      {!manifest && !error && <div className="admission-loading">Se încarcă arhiva testelor…</div>}
      {error && <div className="admission-error">{error}</div>}
      {manifest && !visibleTests.length && <div className="admission-empty">Nu există teste pentru filtrul selectat.</div>}

      <div className="admission-years">
        {years.map((year) => {
          const tests = visibleTests.filter((test) => test.year === year)
          return (
            <section className="admission-year" key={year}>
              <header><span><CalendarDays size={17}/></span><div><h2>{year}</h2><p>{tests.length} {tests.length === 1 ? 'test disponibil' : 'teste disponibile'}</p></div></header>
              <div className="admission-test-grid">
                {tests.map((test) => <AdmissionCard key={test.id} test={test} locked={isDemo && test.id !== DEMO_ADMISSION_TEST_ID} onOpen={() => onNavigate(`#/teste-admitere/${test.id}`)}/>)}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
