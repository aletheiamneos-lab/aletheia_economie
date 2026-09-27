// Client pentru backend-ul platformei (autentificare, administrare, rapoarte).
// Token-ul de sesiune este opac; serverul păstrează doar hash-ul lui.

import type { UserRole } from './types'

const TOKEN_STORAGE_KEY = 'economia-session-token-v1'
export const SESSION_HEADER = 'X-Economie-Session'
export const SESSION_EXPIRED_EVENT = 'economia:session-expired'

export interface ApiUser {
  role: UserRole
  name: string
  email: string
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function getSessionToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setSessionToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
    else window.localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // Fără stocare locală, sesiunea rămâne activă doar până la reîncărcarea paginii.
  }
}

/** Autentificare venită de pe pagina comună amentor.ro: #/intrare/<token> sau #/intrare/demo. */
export function consumeLoginHandoff(): 'demo' | 'session' | null {
  const match = window.location.hash.match(/^#\/intrare\/([A-Za-z0-9_%-]+)$/)
  if (!match) return null
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/`)
  if (match[1] === 'demo') return 'demo'
  setSessionToken(decodeURIComponent(match[1]))
  return 'session'
}

export function sessionHeaders(): Record<string, string> {
  const token = getSessionToken()
  return token ? { [SESSION_HEADER]: token } : {}
}

function errorMessage(payload: unknown, status: number) {
  const detail = (payload as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (detail && typeof detail === 'object' && 'message' in detail && typeof (detail as { message: unknown }).message === 'string') {
    return (detail as { message: string }).message
  }
  if (Array.isArray(detail)) return 'Datele trimise nu sunt valide.'
  if (status >= 500) return 'Serverul nu răspunde momentan. Încearcă din nou peste câteva momente.'
  return 'Cererea nu a putut fi procesată.'
}

export async function apiRequest<T>(path: string, options: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers: { ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...sessionHeaders() },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    })
  } catch (reason) {
    if ((reason as Error)?.name === 'AbortError') throw reason
    throw new ApiError('Nu există conexiune cu serverul. Verifică internetul și reîncearcă.', 0)
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status === 401 && getSessionToken()) {
      setSessionToken(null)
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: errorMessage(payload, 401) }))
    }
    throw new ApiError(errorMessage(payload, response.status), response.status)
  }
  return payload as T
}

// ---------------------------------------------------------------- auth

export async function loginStudent(name: string, email: string) {
  const result = await apiRequest<{ token: string; user: ApiUser }>('/api/auth/student-login', { body: { name, email } })
  setSessionToken(result.token)
  return result.user
}

export async function loginAdmin(password: string) {
  const result = await apiRequest<{ token: string; user: ApiUser }>('/api/auth/admin-login', { body: { password } })
  setSessionToken(result.token)
  return result.user
}

export async function restoreSession(): Promise<ApiUser | null> {
  if (!getSessionToken()) return null
  try {
    const result = await apiRequest<{ user: ApiUser }>('/api/auth/session')
    return result.user
  } catch (reason) {
    if (reason instanceof ApiError && reason.status === 401) return null
    throw reason
  }
}

export async function logoutSession() {
  try {
    if (getSessionToken()) await apiRequest('/api/auth/logout', { body: {} })
  } catch {
    // Deconectarea locală are loc oricum.
  } finally {
    setSessionToken(null)
  }
}

export function changeAdminPassword(currentPassword: string, newPassword: string) {
  return apiRequest<{ ok: boolean }>('/api/auth/change-password', { body: { current_password: currentPassword, new_password: newPassword } })
}

// ---------------------------------------------------------------- student data

export interface ReportSubmission {
  report_type: 'final' | 'admission' | 'recap'
  test_name: string
  test_id?: string
  chapter_number?: number
  year?: number
  session_label?: string
  variant?: string
  economy_range?: string
  score: number
  total: number
  elapsed_seconds: number
  question_ids: string[]
  answers: Record<string, string>
}

export function submitReport(report: ReportSubmission) {
  return apiRequest<{ id: string; archiveCode: string }>('/api/student/reports', { body: report })
}

export interface ActivityUpdate {
  activity_key: string
  test_name: string
  progress: number
  state?: 'in_progress' | 'finished' | 'abandoned'
  score?: number
  total?: number
}

export function trackActivity(update: ActivityUpdate) {
  return apiRequest<{ ok: boolean }>('/api/student/activity', { body: update }).catch(() => null)
}

export async function getLibraryLink(fileName: string) {
  const result = await apiRequest<{ url: string }>(`/api/library/${encodeURIComponent(fileName)}`)
  return result.url
}
