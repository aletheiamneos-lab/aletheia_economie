/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GameEvent, GameManifest } from '../economy-games/economyGames'
import { GameStudioPage } from './GameStudioPage'
import { GamesPage } from './GamesPage'

const ids = [
  '01_market_maker', '02_consumer_lab', '03_factory_master', '04_inflation_detective', '05_central_bank',
  '06_job_market', '07_wall_street_lab', '08_global_trader', '09_economic_pulse', '10_president',
] as const

const manifest: GameManifest = {
  version: 1,
  basePath: '/games/',
  games: ids.map((id, index) => ({
    id,
    file: `${id}.html`,
    title: index === 0 ? 'Piața cafelei' : `Jocul ${index + 1}`,
    topic: index === 0 ? 'Cerere, ofertă și echilibrul pieței' : `Tema ${index + 1}`,
    chapters: [index + 1],
    steps: index === 0 ? 7 : 4,
    maxCoins: index === 0 ? 23 : 10,
  })),
}

function response(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe('Economy Lab games integration', () => {
  it('loads and displays all ten games from the supplied manifest', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(manifest)))
    render(<GamesPage onNavigate={vi.fn()} />)

    expect(await screen.findByRole('heading', { name: 'Piața cafelei' })).toBeInTheDocument()
    expect(document.querySelectorAll('.game-card')).toHaveLength(10)
    expect(screen.getByText('Cerere, ofertă și echilibrul pieței')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /deschide jocul/i })).toHaveLength(10)
  })

  it('navigates to the stable game id from the manifest', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(manifest)))
    const onNavigate = vi.fn()
    render(<GamesPage onNavigate={onNavigate} />)

    fireEvent.click((await screen.findAllByRole('button', { name: /deschide jocul/i }))[0])
    expect(onNavigate).toHaveBeenCalledWith('#/jocuri/01_market_maker')
  })

  it('opens a game in the supplied same-origin iframe configuration', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(manifest)))
    render(<GameStudioPage gameId="01_market_maker" onNavigate={vi.fn()} />)

    const frame = await screen.findByTitle('Piața cafelei')
    expect(frame).toBeInstanceOf(HTMLIFrameElement)
    expect(frame).not.toHaveAttribute('sandbox')
    expect(frame).toHaveAttribute('src', expect.stringMatching(/games\/01_market_maker\.html$/))
  })

  it('stores only the finished result and sends that event unchanged to the backend', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      if (String(input).includes('games.json')) return response(manifest)
      return response({ ok: true })
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<GameStudioPage gameId="01_market_maker" onNavigate={vi.fn()} />)
    await screen.findByTitle('Piața cafelei')

    const levelEvent: GameEvent = { source: 'economy-lab', version: 1, gameId: '01_market_maker', type: 'level', level: 2, totalLevels: 7 }
    const finishedEvent: GameEvent = { source: 'economy-lab', version: 1, gameId: '01_market_maker', type: 'finished', coins: 20, maxCoins: 23, stars: 3 }
    act(() => window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, data: levelEvent })))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    act(() => window.dispatchEvent(new MessageEvent('message', { origin: window.location.origin, data: finishedEvent })))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock.mock.calls[1][0]).toBe('/api/game-results')
    expect(JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string)).toEqual(finishedEvent)
    expect(screen.getByText('3/3')).toBeInTheDocument()
  })

  it('rejects a game id that is absent from the official manifest', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response(manifest)))
    render(<GameStudioPage gameId="joc_inexistent" onNavigate={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Joc indisponibil')
  })
})
