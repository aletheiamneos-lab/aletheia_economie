// Backend simulat pentru testele de interfață. Reproduce regulile serverului:
// doar elevii aprobați intră, conturile blocate sunt refuzate, administratorul are parolă.
import type { StudentAccessRecord, StudentActivityRecord, StudentTestReport } from '../adminData'
import type { ApiUser, ActivityUpdate, ReportSubmission } from '../api'

export const SESSION_HEADER = 'X-Economie-Session'
export const SESSION_EXPIRED_EVENT = 'economia:session-expired'
export const TEST_ADMIN_PASSWORD = 'Parola-Test-1'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface FakeState {
  adminPassword: string
  students: StudentAccessRecord[]
  reports: StudentTestReport[]
  activity: StudentActivityRecord[]
  hidden: string[]
  sessions: Map<string, ApiUser>
  token: string | null
}

function initialState(): FakeState {
  return {
    adminPassword: TEST_ADMIN_PASSWORD,
    students: [
      { id: 'student-andrei', name: 'Andrei Popescu', email: 'andrei@exemplu.ro', status: 'active', isOnline: false, device: '—', lastLogin: null, lastLogout: null, lastActivity: null },
      { id: 'student-radu', name: 'Radu Pavel', email: 'radu@exemplu.ro', status: 'blocked', isOnline: false, device: '—', lastLogin: null, lastLogout: null, lastActivity: null },
    ],
    reports: [
      { id: 'report-1', studentId: 'student-andrei', studentName: 'Andrei Popescu', studentEmail: 'andrei@exemplu.ro', type: 'final', testName: 'Test final · Piața monetară', submittedAt: '2026-09-14T18:36:00+03:00', score: 25, total: 30, elapsedSeconds: 2384, archiveCode: 'CAP12-A9F2D1', chapterNumber: 12 },
    ],
    activity: [],
    hidden: [],
    sessions: new Map(),
    token: null,
  }
}

export const fakeBackend = { state: initialState() }

export function resetFakeBackend() {
  fakeBackend.state = initialState()
}

export function getSessionToken() {
  return fakeBackend.state.token
}

export function setSessionToken(token: string | null) {
  fakeBackend.state.token = token
}

export function sessionHeaders(): Record<string, string> {
  return fakeBackend.state.token ? { [SESSION_HEADER]: fakeBackend.state.token } : {}
}

function currentUser() {
  const token = fakeBackend.state.token
  const user = token ? fakeBackend.state.sessions.get(token) : undefined
  if (!user) throw new ApiError('Sesiunea a expirat. Autentifică-te din nou.', 401)
  return user
}

function requireAdmin() {
  const user = currentUser()
  if (user.role !== 'admin') throw new ApiError('Această acțiune este disponibilă doar administratorului.', 403)
  return user
}

function openSession(user: ApiUser) {
  const token = `token-${fakeBackend.state.sessions.size + 1}-${Date.now()}`
  fakeBackend.state.sessions.set(token, user)
  fakeBackend.state.token = token
  return user
}

export async function loginStudent(name: string, email: string) {
  const student = fakeBackend.state.students.find((item) => item.email === email.trim().toLowerCase())
  if (!student) throw new ApiError('Această adresă de e-mail nu are acces. Cere accesul administratorului.', 403)
  if (student.status === 'blocked') throw new ApiError('Accesul acestui cont este blocat. Contactează administratorul.', 403)
  void name
  student.isOnline = true
  return openSession({ role: 'student', name: student.name, email: student.email })
}

export async function loginAdmin(password: string) {
  if (password !== fakeBackend.state.adminPassword) throw new ApiError('Parola de administrator nu este corectă.', 401)
  return openSession({ role: 'admin', name: 'Administrator', email: '' })
}

export async function restoreSession() {
  try {
    return fakeBackend.state.token ? currentUser() : null
  } catch {
    return null
  }
}

export async function logoutSession() {
  if (fakeBackend.state.token) fakeBackend.state.sessions.delete(fakeBackend.state.token)
  fakeBackend.state.token = null
}

export async function changeAdminPassword(currentPassword: string, newPassword: string) {
  requireAdmin()
  if (currentPassword !== fakeBackend.state.adminPassword) throw new ApiError('Parola curentă nu este corectă.', 400)
  fakeBackend.state.adminPassword = newPassword
  return { ok: true }
}

export async function submitReport(report: ReportSubmission) {
  const user = currentUser()
  const archiveCode = `${report.report_type === 'admission' ? 'ADM' : report.report_type === 'recap' ? 'REC' : 'CAP'}-TEST${fakeBackend.state.reports.length + 1}`
  fakeBackend.state.reports.unshift({
    id: `report-${fakeBackend.state.reports.length + 1}`,
    studentId: fakeBackend.state.students.find((s) => s.email === user.email)?.id ?? '',
    studentName: user.name,
    studentEmail: user.email,
    type: report.report_type,
    testName: report.test_name,
    submittedAt: new Date().toISOString(),
    score: report.score,
    total: report.total,
    elapsedSeconds: report.elapsed_seconds,
    archiveCode,
    chapterNumber: report.chapter_number,
    questionIds: report.question_ids,
    answers: report.answers,
  })
  return { id: archiveCode, archiveCode }
}

export async function trackActivity(update: ActivityUpdate) {
  void update
  return { ok: true }
}

export async function getLibraryLink(fileName: string) {
  currentUser()
  return `https://storage.test/library/${fileName}`
}

export async function apiRequest<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const method = options.method ?? (options.body === undefined ? 'GET' : 'POST')
  const body = (options.body ?? {}) as Record<string, unknown>
  const state = fakeBackend.state
  if (path === '/api/library/settings/visibility') {
    currentUser()
    return { hidden: state.hidden } as T
  }
  requireAdmin()
  if (path === '/api/admin/overview') {
    return { students: state.students, reports: state.reports, activity: state.activity, syncedAt: new Date().toISOString() } as T
  }
  if (path === '/api/admin/usage') {
    return {
      plan: 'Free',
      database: { usedBytes: 12 * 1024 * 1024, limitBytes: 500 * 1024 * 1024, remainingBytes: 488 * 1024 * 1024, percent: 2.4, activeDataBytes: 40960, rows: state.reports.length },
      storage: { usedBytes: 70 * 1024 * 1024, limitBytes: 1024 ** 3, remainingBytes: 954 * 1024 * 1024, percent: 6.84, files: 26 },
      tables: [{ name: 'test_reports', label: 'Rapoarte teste', rows: state.reports.length, bytes: state.reports.length * 900 }],
      measuredAt: new Date().toISOString(),
    } as T
  }
  if (path === '/api/admin/reports/delete') {
    const ids = body.ids as string[]
    const before = state.reports.length
    state.reports = state.reports.filter((report) => !ids.includes(report.id))
    return { deleted: before - state.reports.length } as T
  }
  if (path === '/api/admin/activity/clear') {
    state.activity = state.activity.filter((entry) => entry.state === 'În lucru')
    return { deleted: 0 } as T
  }
  if (path === '/api/admin/library/visibility') {
    state.hidden = body.hidden as string[]
    return { hidden: state.hidden } as T
  }
  if (path === '/api/admin/students' && method === 'POST') {
    const email = String(body.email).trim().toLowerCase()
    if (state.students.some((student) => student.email === email)) throw new ApiError('Adresa există deja în lista de acces.', 409)
    const student: StudentAccessRecord = { id: `student-${state.students.length + 1}`, name: String(body.name).trim(), email, status: 'active', isOnline: false, device: '—', lastLogin: null, lastLogout: null, lastActivity: null }
    state.students.unshift(student)
    return student as T
  }
  if (path === '/api/admin/students/block-all') {
    state.students.forEach((student) => { student.status = body.blocked ? 'blocked' : 'active' })
    return { updated: state.students.length } as T
  }
  const match = path.match(/^\/api\/admin\/students\/([^/]+)(\/disconnect)?$/)
  if (match) {
    const student = state.students.find((item) => item.id === match[1])
    if (!student) throw new ApiError('Elevul nu a fost găsit.', 404)
    if (match[2]) student.isOnline = false
    else if (method === 'DELETE') state.students = state.students.filter((item) => item.id !== student.id)
    else student.status = body.blocked ? 'blocked' : 'active'
    return { ok: true } as T
  }
  throw new ApiError(`Ruta simulată nu există: ${method} ${path}`, 404)
}
