import { ArrowRight, CircleAlert, Coins, Gamepad2, Layers3, LoaderCircle, ShieldCheck, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { loadGameManifest, type GameManifest } from '../economy-games/economyGames'
import { getGamePresentation } from '../games/catalog'

interface GamesPageProps {
  onNavigate: (path: string) => void
}

export function GamesPage({ onNavigate }: GamesPageProps) {
  const [manifest, setManifest] = useState<GameManifest | null>(null)
  const [error, setError] = useState('')

  const loadGames = useCallback(async () => {
    setError('')
    try {
      setManifest(await loadGameManifest())
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Lista jocurilor nu a putut fi încărcată.')
    }
  }, [])

  useEffect(() => { void loadGames() }, [loadGames])

  return (
    <div className="games-page page-enter">
      <header className="games-hero">
        <div className="games-hero-copy">
          <span className="games-kicker"><Gamepad2 size={14}/> Laborator de decizii</span>
          <h1>Alege un joc. <em>Învață prin decizii.</em></h1>
          <p>10 simulări scurte în care aplici teoria și vezi imediat consecințele alegerilor tale.</p>
          <div className="games-hero-points">
            <span><Layers3 size={15}/><b>10</b> jocuri</span>
            <span><ShieldCheck size={15}/> scor și explicații</span>
            <span><Sparkles size={15}/> progres salvat</span>
          </div>
        </div>
        <div className="games-hero-orbit" aria-hidden="true">
          <span className="games-orbit-ring ring-one"/>
          <span className="games-orbit-ring ring-two"/>
          <span className="games-orbit-core"><Gamepad2 size={31}/><b>10</b><small>jocuri</small></span>
          <i className="game-node node-a">P</i><i className="game-node node-b">Q</i><i className="game-node node-c">π</i><i className="game-node node-d">PIB</i>
        </div>
      </header>

      <section className="games-catalog" aria-labelledby="games-catalog-title">
        <div className="games-section-heading">
          <div><span className="micro-label">Toate jocurile</span><h2 id="games-catalog-title">Alege jocul</h2></div>
          <p>Poți începe cu oricare. Fiecare joc îți explică rezultatul la final.</p>
        </div>

        {!manifest && !error && <div className="games-load-state" role="status"><LoaderCircle className="spin"/><b>Încărcăm jocurile…</b></div>}
        {error && <div className="games-load-state error" role="alert"><CircleAlert/><b>Jocurile nu au putut fi încărcate</b><span>{error}</span><button onClick={() => void loadGames()}>Încearcă din nou</button></div>}

        {manifest && <div className="games-grid">
          {manifest.games.map((game, position) => {
            const presentation = getGamePresentation(game.id)
            const Icon = presentation?.icon ?? Gamepad2
            const accent = presentation?.accent ?? '#2f8792'
            const chapterLabel = game.chapters.length === 1 ? `Capitolul ${game.chapters[0]}` : `Capitolele ${game.chapters.join(', ')}`
            return (
              <article className="game-card" key={game.id} style={{ '--game-accent': accent } as CSSProperties}>
                <div className="game-card-top"><span className="game-card-index">{String(position + 1).padStart(2, '0')}</span><span className="game-card-icon"><Icon size={21}/></span></div>
                <span className="game-card-chapter">{chapterLabel}</span>
                <h3>{game.title}</h3>
                <strong>{game.topic}</strong>
                <p>Parcurge cele {game.steps} etape și aplică noțiunile direct în situații economice.</p>
                <div className="game-card-meta"><span>{game.steps} etape</span><span><Coins size={11}/> maximum {game.maxCoins} monede</span></div>
                <button aria-label={`Deschide jocul ${game.title}`} onClick={() => onNavigate(`#/jocuri/${game.id}`)}>
                  Joacă acum <ArrowRight size={15}/>
                </button>
              </article>
            )
          })}
        </div>}
      </section>
    </div>
  )
}
