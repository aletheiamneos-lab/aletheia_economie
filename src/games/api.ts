import type { GameId } from './catalog'

export type GameValue = string | number | boolean | null | GameValue[] | { [key: string]: GameValue }

export interface GamePublicState {
  finished: boolean
  score?: number
  round?: number
  total?: number
  quarter?: number
  total_quarters?: number
  total_rounds?: number
  scenario?: Record<string, GameValue>
  state?: Record<string, GameValue>
  controls?: Record<string, GameValue>
  policy_options?: string[]
  decision?: {
    id: string
    year: number
    title: string
    context: string
    concepts: string[]
    options: Array<{ id: string; label: string }>
  } | null
}

export interface GameFeedback {
  type: 'correct' | 'partial' | 'incorrect' | 'neutral'
  title: string
  explanation: string
  concepts: string[]
}

export interface GameActionResult {
  accepted: boolean
  feedback: GameFeedback
  public_state: GamePublicState
  score_delta: number
  animation_cues: Array<Record<string, GameValue>>
}

interface StartResult {
  session_id: string
  public_state: GamePublicState
}

const API_ROOT = '/api/game-service'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { detail?: string } | null
    throw new Error(body?.detail ?? `Motorul jocului nu a răspuns (${response.status}).`)
  }
  return response.json() as Promise<T>
}

export function startGame(gameId: GameId, seed = 0) {
  return request<StartResult>(`/games/${gameId}/sessions`, {
    method: 'POST',
    body: JSON.stringify({ seed }),
  })
}

export function applyGameAction(sessionId: string, action: Record<string, GameValue>) {
  return request<GameActionResult>(`/sessions/${sessionId}/actions`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}

export function restartGame(sessionId: string) {
  return request<StartResult>(`/sessions/${sessionId}/restart`, { method: 'POST' })
}

export function getGameReport(sessionId: string) {
  return request<Record<string, GameValue>>(`/sessions/${sessionId}/report`)
}

