import { ArrowLeft, CircleAlert, Coins, LoaderCircle, RefreshCcw, Star } from 'lucide-react'
import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import {
  gameUrl,
  listenToGameEvents,
  loadGameManifest,
  type GameEvent,
  type GameManifestEntry,
} from '../economy-games/economyGames'
import { getGamePresentation } from '../games/catalog'
import { sessionHeaders } from '../api'

interface GameStudioPageProps {
  gameId: string
  onNavigate: (path: string) => void
}

type FinishedEvent = Extract<GameEvent, { type: 'finished' }>

function rememberResult(event: FinishedEvent) {
  try {
    const key = 'economia-game-results'
    const current = JSON.parse(window.localStorage.getItem(key) ?? '{}') as Record<string, FinishedEvent>
    window.localStorage.setItem(key, JSON.stringify({ ...current, [event.gameId]: event }))
  } catch {
    // Rezultatul este trimis în continuare către serviciul aplicației.
  }
}

async function saveResult(event: FinishedEvent) {
  const response = await fetch('/api/game-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
    body: JSON.stringify(event),
  })
  if (!response.ok) throw new Error(`Rezultatul nu a putut fi salvat (${response.status}).`)
}

export function GameStudioPage({ gameId, onNavigate }: GameStudioPageProps) {
  const [game, setGame] = useState<GameManifestEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [frameKey, setFrameKey] = useState(0)
  const [ready, setReady] = useState(false)
  const [level, setLevel] = useState(0)
  const [coins, setCoins] = useState(0)
  const [result, setResult] = useState<FinishedEvent | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void loadGameManifest()
      .then((manifest) => {
        if (!active) return
        const entry = manifest.games.find((item) => item.id === gameId)
        if (!entry) throw new Error('Jocul cerut nu există în lista oficială.')
        setGame(entry)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Jocul nu a putut fi încărcat.')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [gameId])

  useEffect(() => listenToGameEvents((event) => {
    if (event.gameId !== gameId) return
    if (event.type === 'ready') setReady(true)
    if (event.type === 'level') setLevel(event.level)
    if (event.type === 'coins') setCoins(event.coins)
    if (event.type === 'restart') {
      setLevel(0)
      setCoins(0)
      setResult(null)
      setSaveStatus('idle')
    }
    if (event.type === 'finished') {
      setCoins(event.coins)
      setResult(event)
      setSaveStatus('saving')
      rememberResult(event)
      void saveResult(event)
        .then(() => setSaveStatus('saved'))
        .catch(() => setSaveStatus('error'))
    }
  }), [gameId])

  const restart = useCallback(() => {
    setFrameKey((value) => value + 1)
    setReady(false)
    setLevel(0)
    setCoins(0)
    setResult(null)
    setSaveStatus('idle')
  }, [])

  if (loading) return <div className="game-player-state" role="status"><LoaderCircle className="spin"/><h2>Pregătim jocul…</h2></div>
  if (error || !game) return <div className="game-player-state error" role="alert"><CircleAlert/><h1>Joc indisponibil</h1><p>{error}</p><button onClick={() => onNavigate('#/jocuri')}>Înapoi la jocuri</button></div>

  const presentation = getGamePresentation(game.id)
  const Icon = presentation?.icon
  const chapterLabel = game.chapters.length === 1 ? `Capitolul ${game.chapters[0]}` : `Capitolele ${game.chapters.join(', ')}`

  return <div className="game-player-page" style={{ '--game-accent': presentation?.accent ?? '#2f8792' } as CSSProperties}>
    <header className="game-player-header">
      <button className="game-player-back" onClick={() => onNavigate('#/jocuri')}><ArrowLeft size={17}/><span>Toate jocurile</span></button>
      <div className="game-player-identity">
        {Icon && <span><Icon size={19}/></span>}
        <div><small>{chapterLabel}</small><h1>{game.title}</h1></div>
      </div>
      <div className="game-player-live" aria-live="polite">
        <span>{ready ? (level ? `Etapa ${level}/${game.steps}` : 'Joc pregătit') : 'Se încarcă…'}</span>
        <b><Coins size={14}/>{coins}/{game.maxCoins}</b>
        {result && <b className="game-player-stars"><Star size={14}/>{result.stars}/3</b>}
        {saveStatus === 'saving' && <small>Se salvează…</small>}
        {saveStatus === 'saved' && <small className="saved">Rezultat salvat</small>}
        {saveStatus === 'error' && <small className="save-error">Salvat pe dispozitiv</small>}
      </div>
      <button className="game-player-restart" onClick={restart} title="Repornește jocul"><RefreshCcw size={16}/><span>Restart</span></button>
    </header>
    <iframe
      key={`${game.id}-${frameKey}`}
      className="economy-game-frame"
      src={gameUrl(game)}
      title={game.title}
      loading="eager"
    />
  </div>
}
