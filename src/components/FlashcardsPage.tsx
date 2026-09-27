import {
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronLeft,
  CircleCheck,
  Eye,
  LibraryBig,
  LockKeyhole,
  Play,
  RefreshCcw,
  RotateCcw,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { flashcardDifficulties, loadFlashcardDeck, type FlashcardDeck, type FlashcardDifficulty } from '../data/flashcards'
import { isDemoFlashcardDeck } from '../demoAccess'
import { DemoLockPage } from './DemoLockPage'

const progressStorageKey = 'economia-flashcards-progress-v1'
const cardsPerDeck = 30
const decksPerDifficulty = 30

interface DeckProgress {
  index: number
  reviewed: number[]
  mastered: number[]
}

type StoredProgress = Record<string, DeckProgress>

function deckKey(difficulty: FlashcardDifficulty, slot: number) {
  return `${difficulty}:${slot}`
}

function progressStorage(isDemo: boolean) {
  return isDemo ? window.sessionStorage : window.localStorage
}

function readStoredProgress(key: string, total: number, isDemo = false): DeckProgress {
  try {
    const all = JSON.parse(progressStorage(isDemo).getItem(progressStorageKey) ?? '{}') as StoredProgress
    const saved = all[key]
    if (!saved) return { index: 0, reviewed: [], mastered: [] }
    return {
      index: Math.min(total, Math.max(0, Number(saved.index) || 0)),
      reviewed: Array.isArray(saved.reviewed) ? saved.reviewed.filter((value) => Number.isInteger(value) && value >= 0 && value < total) : [],
      mastered: Array.isArray(saved.mastered) ? saved.mastered.filter((value) => Number.isInteger(value) && value >= 0 && value < total) : [],
    }
  } catch {
    return { index: 0, reviewed: [], mastered: [] }
  }
}

function storeProgress(key: string, progress: DeckProgress, isDemo = false) {
  try {
    const storage = progressStorage(isDemo)
    const all = JSON.parse(storage.getItem(progressStorageKey) ?? '{}') as StoredProgress
    storage.setItem(progressStorageKey, JSON.stringify({ ...all, [key]: progress }))
  } catch {
    // Studiul rămâne funcțional și când stocarea locală nu este disponibilă.
  }
}

function unique(values: number[]) {
  return [...new Set(values)]
}

function DeckTile({ difficulty, label, slot, onOpen, locked = false, isDemo = false }: {
  difficulty: FlashcardDifficulty
  label: string
  slot: number
  onOpen: () => void
  locked?: boolean
  isDemo?: boolean
}) {
  const progress = readStoredProgress(deckKey(difficulty, slot), cardsPerDeck, isDemo)
  const reviewed = progress.reviewed.length
  const percent = Math.round((reviewed / cardsPerDeck) * 100)
  const finished = reviewed === cardsPerDeck

  return (
    <article className={`flashcards-deck-tile difficulty-${difficulty} ${finished ? 'is-finished' : ''} ${locked ? 'is-demo-locked' : ''}`}>
      <div className="flashcards-deck-topline">
        <span>Setul {locked && <i className="demo-lock-badge"><LockKeyhole size={9}/> Demo</i>}</span>
        <b>{String(slot).padStart(2, '0')}</b>
      </div>
      <span className="flashcards-deck-level">{label}</span>
      <h3>30 de întrebări</h3>
      <p>{finished ? 'Set finalizat' : reviewed ? `${reviewed} carduri parcurse` : 'Set nou'}</p>
      <div className="flashcards-deck-progress" aria-label={`${percent}% parcurs`}><i style={{ width: `${percent}%` }}/></div>
      <button type="button" onClick={onOpen} aria-label={locked ? `Blocat în Demo: ${label}, setul ${String(slot).padStart(2, '0')}` : `Deschide ${label}, setul ${String(slot).padStart(2, '0')}`}>
        {locked ? <><LockKeyhole size={13}/> Disponibil cu cont</> : finished ? <><RefreshCcw size={14}/> Reia setul</> : reviewed ? <><Play size={14}/> Continuă</> : <><Play size={14}/> Deschide</>}
      </button>
    </article>
  )
}

interface FlashcardsPageProps {
  isDemo?: boolean
  initialDemoDeck?: boolean
  onDemoLogin?: () => void
}

export function FlashcardsPage({ isDemo = false, initialDemoDeck = false, onDemoLogin = () => undefined }: FlashcardsPageProps) {
  const [isStudying, setIsStudying] = useState(isDemo && initialDemoDeck)
  const [showDemoLock, setShowDemoLock] = useState(false)
  const [difficulty, setDifficulty] = useState<FlashcardDifficulty>('usor')
  const [slot, setSlot] = useState(1)
  const [deck, setDeck] = useState<FlashcardDeck | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [reviewed, setReviewed] = useState<number[]>([])
  const [mastered, setMastered] = useState<number[]>([])
  const [revealed, setRevealed] = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  const currentDeckKey = deckKey(difficulty, slot)

  useEffect(() => {
    if (!isStudying) return undefined
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setDeck(null)
    setRevealed(false)
    loadFlashcardDeck(difficulty, slot, controller.signal)
      .then((nextDeck) => {
        const progress = readStoredProgress(deckKey(difficulty, slot), nextDeck.intrebari.length, isDemo)
        setDeck(nextDeck)
        setCurrentIndex(progress.index)
        setReviewed(progress.reviewed)
        setMastered(progress.mastered)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setError(reason instanceof Error ? reason.message : 'Setul nu a putut fi încărcat.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [difficulty, isDemo, isStudying, retryToken, slot])

  const total = deck?.intrebari.length ?? cardsPerDeck
  const finished = Boolean(deck && currentIndex >= deck.intrebari.length)
  const current = deck && !finished ? deck.intrebari[currentIndex] : null
  const reviewedCount = reviewed.length
  const repeatCount = reviewed.filter((index) => !mastered.includes(index)).length
  const progressPercent = Math.round((reviewedCount / total) * 100)
  const difficultyLabel = flashcardDifficulties.find((item) => item.id === difficulty)?.label ?? 'Ușor'
  const correctAnswer = useMemo(() => current ? current.variante[current.raspuns_corect] : '', [current])
  const longCopy = Boolean(current && (current.enunt.length > 420 || correctAnswer.length > 420))

  const openDeck = (nextDifficulty: FlashcardDifficulty, nextSlot: number) => {
    if (isDemo && !isDemoFlashcardDeck(nextDifficulty, nextSlot)) {
      setShowDemoLock(true)
      return
    }
    setDifficulty(nextDifficulty)
    setSlot(nextSlot)
    setIsStudying(true)
  }

  const returnToCatalog = () => {
    setIsStudying(false)
    setDeck(null)
    setError('')
    setRevealed(false)
  }

  const saveAnswer = (known: boolean) => {
    if (!current) return
    const nextReviewed = unique([...reviewed, currentIndex])
    const nextMastered = known
      ? unique([...mastered, currentIndex])
      : mastered.filter((index) => index !== currentIndex)
    const nextIndex = currentIndex + 1
    setReviewed(nextReviewed)
    setMastered(nextMastered)
    setCurrentIndex(nextIndex)
    setRevealed(false)
    storeProgress(currentDeckKey, { index: nextIndex, reviewed: nextReviewed, mastered: nextMastered }, isDemo)
  }

  const goBack = () => {
    setCurrentIndex((value) => Math.max(0, value - 1))
    setRevealed(false)
  }

  const restart = () => {
    const reset = { index: 0, reviewed: [], mastered: [] }
    setCurrentIndex(0)
    setReviewed([])
    setMastered([])
    setRevealed(false)
    storeProgress(currentDeckKey, reset, isDemo)
  }

  const openNextSet = () => {
    if (isDemo) {
      setShowDemoLock(true)
      return
    }
    setSlot((value) => value === decksPerDifficulty ? 1 : value + 1)
  }

  if (showDemoLock) return <DemoLockPage onBack={() => setShowDemoLock(false)} onLogin={onDemoLogin}/>

  if (!isStudying) {
    return (
      <div className="flashcards-catalog-page">
        <header className="flashcards-catalog-header">
          <div>
            <span className="page-kicker"><LibraryBig size={15}/> Colecție de studiu</span>
            <h1>Flashcarduri</h1>
            <p>Alege dificultatea și setul pe care vrei să îl parcurgi.</p>
          </div>
          <span className="flashcards-catalog-count">120 seturi · 3.600 întrebări</span>
        </header>

        <nav className="flashcards-catalog-jumps" aria-label="Dificultățile colecției">
          {flashcardDifficulties.map((item) => (
            <button type="button" key={item.id} onClick={() => document.getElementById(`flashcards-${item.id}`)?.scrollIntoView()}>
              {item.label}<b>30</b>
            </button>
          ))}
        </nav>

        {flashcardDifficulties.map((item) => (
          <section className={`flashcards-catalog-group difficulty-${item.id}`} id={`flashcards-${item.id}`} key={item.id}>
            <header>
              <div><span>Nivel de dificultate</span><h2>{item.label}</h2><p>30 de seturi · 900 de întrebări</p></div>
              <b>30 seturi</b>
            </header>
            <div className="flashcards-catalog-grid">
              {Array.from({ length: decksPerDifficulty }, (_, index) => (
                <DeckTile
                  key={index + 1}
                  difficulty={item.id}
                  label={item.label}
                  slot={index + 1}
                  isDemo={isDemo}
                  locked={isDemo && !isDemoFlashcardDeck(item.id, index + 1)}
                  onOpen={() => openDeck(item.id, index + 1)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="flashcards-study-page">
      <header className="flashcards-study-header">
        <button type="button" className="flashcards-catalog-back" onClick={returnToCatalog}><ArrowLeft size={16}/> Toate seturile</button>
        <div className="flashcards-study-title">
          <span>{difficultyLabel}</span>
          <h1>Setul {String(slot).padStart(2, '0')}</h1>
        </div>
        <div className="flashcards-study-stats">
          <span><Check size={13}/><b>{mastered.length}</b> știute</span>
          <span><RotateCcw size={13}/><b>{repeatCount}</b> de repetat</span>
          <span><BookOpen size={13}/><b>{reviewedCount}</b> / {total}</span>
        </div>
      </header>

      <section className="flashcards-study-progress" aria-label="Progresul setului">
        <div className="flashcards-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
          <i style={{ width: `${progressPercent}%` }}/>
        </div>
        <b>{progressPercent}%</b>
      </section>

      <main className="flashcards-stage">
        {loading && <div className="flashcards-state" role="status"><BrainCircuit size={24}/><b>Se pregătește setul…</b></div>}
        {!loading && error && <div className="flashcards-state error" role="alert"><b>Nu am putut deschide setul.</b><p>{error}</p><button onClick={() => setRetryToken((value) => value + 1)}>Încearcă din nou</button></div>}

        {!loading && !error && finished && (
          <article className="flashcards-finished">
            <span><CircleCheck size={28}/></span>
            <small>Set finalizat</small>
            <h2>{mastered.length} din {total} carduri sunt clare.</h2>
            <p>{repeatCount ? `Ai ${repeatCount} carduri pe care merită să le repeți.` : 'Excelent — ai marcat toate cardurile ca înțelese.'}</p>
            <div>
              <button className="flashcard-secondary" onClick={returnToCatalog}><LibraryBig size={16}/> Toate seturile</button>
              <button className="flashcard-secondary" onClick={restart}><RefreshCcw size={16}/> Reia setul</button>
              <button className="flashcard-primary" onClick={openNextSet}>Setul următor</button>
            </div>
          </article>
        )}

        {!loading && !error && current && (
          <article className={`flashcard-card ${revealed ? 'is-revealed' : ''} ${longCopy ? 'has-long-copy' : ''}`}>
            <header>
              <button type="button" className="flashcard-back" onClick={goBack} disabled={currentIndex === 0} aria-label="Cardul anterior"><ChevronLeft size={18}/></button>
              <div>
                <span>Cardul {currentIndex + 1} din {total}</span>
                <b>{revealed ? 'Răspuns și explicație' : 'Întrebare'}</b>
              </div>
              <span className="flashcard-level">{difficultyLabel}</span>
            </header>

            <div className="flashcard-content">
              {!revealed ? (
                <div className="flashcard-front">
                  <span className="flashcard-symbol">?</span>
                  <h2>{current.enunt}</h2>
                  <p>Gândește răspunsul, apoi verifică explicația.</p>
                </div>
              ) : (
                <div className="flashcard-answer">
                  <span className="flashcard-answer-label"><Check size={14}/> Varianta {current.raspuns_corect.toUpperCase()}</span>
                  <h2>{correctAnswer}</h2>
                  <div><small>De ce?</small><p>{current.rezolvare}</p></div>
                </div>
              )}
            </div>

            <footer>
              {!revealed ? (
                <button type="button" className="flashcard-primary reveal" onClick={() => setRevealed(true)}><Eye size={17}/> Arată răspunsul</button>
              ) : (
                <>
                  <button type="button" className="flashcard-secondary" onClick={() => saveAnswer(false)}><RotateCcw size={16}/> Mai repet</button>
                  <button type="button" className="flashcard-primary" onClick={() => saveAnswer(true)}><Check size={17}/> Știu răspunsul</button>
                </>
              )}
            </footer>
          </article>
        )}
      </main>
    </div>
  )
}
