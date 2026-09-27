import { lazy, Suspense, useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { Dashboard } from './components/Dashboard'
import { LoginPage, type LoginRequest } from './components/LoginPage'
import { ApiError, loginAdmin, loginStudent, logoutSession, restoreSession, SESSION_EXPIRED_EVENT, type ApiUser } from './api'
import { NotesDrawer } from './components/NotesDrawer'
import { DemoLockPage } from './components/DemoLockPage'
import { ProfilePage } from './components/ProfilePage'
import { chapters } from './data/catalog'
import { useSessionState } from './session'
import { useAdminData } from './adminData'
import { getGameMeta } from './games/catalog'
import { useAppearance } from './preferences'
import { isLockedForDemo } from './demoAccess'
import type { Route } from './types'

export { DEMO_CHAPTERS, isLockedForDemo } from './demoAccess'

const AdminReportsPage = lazy(() => import('./components/AdminReportsPage').then((module) => ({ default: module.AdminReportsPage })))
const AdmissionAssessmentPage = lazy(() => import('./components/AdmissionAssessmentPage').then((module) => ({ default: module.AdmissionAssessmentPage })))
const AdmissionTestsPage = lazy(() => import('./components/AdmissionTestsPage').then((module) => ({ default: module.AdmissionTestsPage })))
const FinalAssessmentRoutePage = lazy(() => import('./components/FinalAssessmentRoutePage').then((module) => ({ default: module.FinalAssessmentRoutePage })))
const CurriculumMap = lazy(() => import('./components/CurriculumMap').then((module) => ({ default: module.CurriculumMap })))
const GamesPage = lazy(() => import('./components/GamesPage').then((module) => ({ default: module.GamesPage })))
const GameStudioPage = lazy(() => import('./components/GameStudioPage').then((module) => ({ default: module.GameStudioPage })))
const GraphLabPage = lazy(() => import('./components/GraphLabPage').then((module) => ({ default: module.GraphLabPage })))
const LessonRoutePage = lazy(() => import('./components/LessonRoutePage').then((module) => ({ default: module.LessonRoutePage })))
const LessonsPage = lazy(() => import('./components/LessonsPage').then((module) => ({ default: module.LessonsPage })))
const LibraryPage = lazy(() => import('./components/LibraryPage').then((module) => ({ default: module.LibraryPage })))
const MathWorkspacePage = lazy(() => import('./components/MathWorkspacePage').then((module) => ({ default: module.MathWorkspacePage })))
const FlashcardsPage = lazy(() => import('./components/FlashcardsPage').then((module) => ({ default: module.FlashcardsPage })))
const PracticeAssessmentRoutePage = lazy(() => import('./components/PracticeAssessmentRoutePage').then((module) => ({ default: module.PracticeAssessmentRoutePage })))
const RecapTestsPage = lazy(() => import('./components/RecapTestsPage').then((module) => ({ default: module.RecapTestsPage })))

function validChapterNumber(value: string) {
  const chapterNumber = Number(value)
  return Number.isInteger(chapterNumber) && chapterNumber >= 1 && chapterNumber <= 19
    ? chapterNumber
    : null
}

function parseRoute(hash: string): Route {
  if (hash === '#/auth') return { page: 'admin-login' }
  if (hash === '#/admin/rapoarte') return { page: 'admin-reports' }
  if (hash === '#/biblioteca') return { page: 'library' }
  if (hash === '#/lectii') return { page: 'lessons' }
  if (hash === '#/caiet-matematic') return { page: 'math-workspace' }
  if (hash === '#/flashcarduri' || hash.startsWith('#/flashcarduri?')) {
    const params = new URLSearchParams(hash.split('?')[1] ?? '')
    return { page: 'flashcards', openDemoDeck: params.get('dificultate') === 'usor' && params.get('set') === '1' }
  }
  const gameMatch = hash.match(/^#\/jocuri\/([a-z0-9_]+)$/)
  if (gameMatch) return { page: 'game', gameId: gameMatch[1] }
  if (hash === '#/jocuri') return { page: 'games' }
  const admissionMatch = hash.match(/^#\/teste-admitere\/([a-z0-9-]+)$/)
  if (admissionMatch) return { page: 'admission-assessment', testId: admissionMatch[1] }
  if (hash === '#/teste-admitere') return { page: 'admission-tests' }
  const graphLabMatch = hash.match(/^#\/grafice(?:\/(\d+))?$/)
  if (graphLabMatch) {
    const lesson = graphLabMatch[1] ? validChapterNumber(graphLabMatch[1]) : null
    return { page: 'graph-lab', lesson: lesson ?? undefined }
  }
  const recapMatch = hash.match(/^#\/teste-recapitulative\/capitol\/(\d+)$/)
  if (recapMatch) {
    const chapter = validChapterNumber(recapMatch[1])
    if (chapter !== null) return { page: 'recap-assessment', chapter }
  }
  if (hash === '#/teste-recapitulative') return { page: 'recap-tests' }
  if (hash === '#/profil') return { page: 'profile' }
  const chapterMatch = hash.match(/^#\/capitol\/(\d+)(?:\/(test-final|antrenament))?/)
  if (chapterMatch) {
    const chapter = validChapterNumber(chapterMatch[1])
    if (chapter !== null) {
      if (chapterMatch[2] === 'test-final') return { page: 'assessment', chapter, mode: 'final' }
      if (chapterMatch[2] === 'antrenament') return { page: 'assessment', chapter, mode: 'practice' }
      const params = new URLSearchParams(hash.split('?')[1] ?? '')
      return { page: 'lesson', chapter, section: params.get('sectiune') ?? undefined }
    }
  }
  if (hash.startsWith('#/harta')) return { page: 'map' }
  return { page: 'dashboard' }
}

export function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash))
  const [notesOpen, setNotesOpen] = useState(false)
  const sessionApi = useSessionState()
  const isAdminSession = sessionApi.session.isAuthenticated && sessionApi.session.userRole === 'admin'
  const adminDataApi = useAdminData(isAdminSession)
  const appearanceApi = useAppearance()
  const [authChecked, setAuthChecked] = useState(false)
  const [loginNotice, setLoginNotice] = useState('')

  const activeChapterNumber = route.page === 'lesson' || route.page === 'assessment' || route.page === 'recap-assessment'
    ? route.chapter
    : route.page === 'graph-lab' && route.lesson
      ? route.lesson
      : sessionApi.session.lastChapter
  const activeChapter = chapters.find((chapter) => chapter.number === activeChapterNumber) ?? chapters[0]

  useEffect(() => {
    const update = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', update)
    if (!window.location.hash) window.history.replaceState(null, '', '#/')
    return () => window.removeEventListener('hashchange', update)
  }, [])

  useEffect(() => {
    if (sessionApi.session.isAuthenticated && !sessionApi.session.isDemo && sessionApi.session.userRole !== 'admin' && route.page === 'admin-reports') {
      window.location.hash = '#/'
    }
  }, [route.page, sessionApi.session.isAuthenticated, sessionApi.session.isDemo, sessionApi.session.userRole])

  // Restaurează sesiunea salvată (după reîncărcarea paginii).
  useEffect(() => {
    let active = true
    restoreSession()
      .then((user) => {
        if (active && user) sessionApi.login(user)
      })
      .catch(() => {
        if (active) setLoginNotice('Serverul nu răspunde momentan. Încearcă din nou peste câteva momente.')
      })
      .finally(() => {
        if (active) setAuthChecked(true)
      })
    return () => { active = false }
  }, [sessionApi.login])

  // Sesiune expirată, cont blocat sau deconectare forțată de administrator.
  useEffect(() => {
    const expire = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail
      sessionApi.logout()
      setLoginNotice(detail || 'Sesiunea a expirat. Autentifică-te din nou.')
      window.location.hash = '#/'
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, expire)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire)
  }, [sessionApi.logout])

  // Semnal periodic: menține elevul „online” și detectează blocarea/deconectarea.
  useEffect(() => {
    if (!sessionApi.session.isAuthenticated || sessionApi.session.isDemo) return
    const timer = window.setInterval(() => { void restoreSession().catch(() => null) }, 60_000)
    return () => window.clearInterval(timer)
  }, [sessionApi.session.isAuthenticated, sessionApi.session.isDemo])

  useEffect(() => {
    const lockedForDemo = sessionApi.session.isDemo && isLockedForDemo(route)
    if (!lockedForDemo && (route.page === 'lesson' || route.page === 'assessment' || route.page === 'recap-assessment')) sessionApi.selectChapter(route.chapter)
    if (!lockedForDemo && route.page === 'graph-lab' && route.lesson) sessionApi.selectChapter(route.lesson)
    if (!sessionApi.session.isAuthenticated) {
      document.title = 'Autentificare — Economie by A mentor'
      return
    }
    const pageTitle = route.page === 'dashboard'
      ? 'Economia — acasă'
      : route.page === 'library'
        ? 'Bibliotecă — Economia'
      : route.page === 'lessons'
        ? 'Lecții — Economia'
      : route.page === 'math-workspace'
        ? 'Caiet matematic — Economia'
      : route.page === 'flashcards'
        ? 'Flashcarduri — Economia'
      : route.page === 'games'
        ? 'Jocuri economice — Economia'
      : route.page === 'game'
        ? `${getGameMeta(route.gameId)?.title ?? 'Joc economic'} — Economia`
      : route.page === 'map'
        ? 'Harta materiei — Economia'
        : route.page === 'graph-lab'
          ? 'Grafice interactive — Economia'
        : route.page === 'recap-tests'
          ? 'Teste recapitulative — Economia'
          : route.page === 'admission-tests'
            ? 'Teste de admitere — Economia'
          : route.page === 'admission-assessment'
            ? 'Test de admitere — Economia'
          : route.page === 'recap-assessment'
            ? `Test recapitulativ — Capitolul ${route.chapter}`
          : route.page === 'admin-reports'
            ? 'Rapoarte și acces — Economia'
          : route.page === 'profile'
            ? 'Profil — Economia'
        : route.page === 'admin-login'
          ? 'Economia — acasă'
        : route.page === 'lesson'
          ? `Capitolul ${route.chapter} — ${activeChapter.title}`
          : `${route.mode === 'final' ? 'Test final' : 'Antrenament'} — Capitolul ${route.chapter}`
    document.title = pageTitle
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [route, activeChapter.title, sessionApi.selectChapter, sessionApi.session.isAuthenticated, sessionApi.session.isDemo])

  const navigate = (path: string) => {
    // Update the visible route immediately. The hashchange listener remains
    // responsible for browser back/forward navigation, but a menu click no
    // longer depends on that asynchronous event being delivered first.
    setRoute(parseRoute(path))
    if (window.location.hash !== path) window.location.hash = path
  }

  const login = async (request: LoginRequest) => {
    if (request.role === 'demo') {
      setLoginNotice('')
      sessionApi.login({ name: 'Vizitator Demo', email: '', role: 'student', demo: true })
      navigate('#/')
      return null
    }
    let user: ApiUser
    try {
      user = request.role === 'admin' ? await loginAdmin(request.password) : await loginStudent(request.name, request.email)
    } catch (reason) {
      return reason instanceof ApiError || reason instanceof Error ? reason.message : 'Autentificarea nu a reușit.'
    }
    setLoginNotice('')
    sessionApi.login(user)
    if (user.role === 'student' && window.location.hash === '#/admin/rapoarte') navigate('#/')
    if (user.role === 'admin' && (route.page === 'dashboard' || route.page === 'admin-login')) navigate('#/admin/rapoarte')
    else if (route.page === 'admin-login') navigate('#/')
    return null
  }

  if (!authChecked) return <div className="route-loading" role="status"><span />Se verifică sesiunea…</div>
  if (!sessionApi.session.isAuthenticated) return <LoginPage key={route.page === 'admin-login' ? 'admin' : 'public'} onLogin={login} notice={loginNotice} adminOnly={route.page === 'admin-login'} />
  const demoLocked = sessionApi.session.isDemo && isLockedForDemo(route)

  return (
    <AppShell
      route={route}
      sessionApi={sessionApi}
      onNavigate={navigate}
      onLogout={() => {
        if (!sessionApi.session.isDemo) void logoutSession()
        sessionApi.logout()
        navigate('#/')
      }}
    >
      <Suspense fallback={<div className="route-loading" role="status"><span />Se pregătește secțiunea…</div>}>
        {demoLocked ? <DemoLockPage onBack={() => navigate('#/')} onLogin={() => { sessionApi.logout(); navigate('#/') }} /> : <>
        {(route.page === 'dashboard' || route.page === 'admin-login') && <Dashboard sessionApi={sessionApi} onNavigate={navigate} />}
        {route.page === 'library' && <LibraryPage isAdmin={sessionApi.session.userRole === 'admin'} />}
        {route.page === 'lessons' && <LessonsPage sessionApi={sessionApi} isDemo={sessionApi.session.isDemo} onNavigate={navigate} />}
        {route.page === 'math-workspace' && <MathWorkspacePage />}
        {route.page === 'flashcards' && <FlashcardsPage key={route.openDemoDeck ? 'demo-deck' : 'catalog'} isDemo={sessionApi.session.isDemo} initialDemoDeck={route.openDemoDeck} onDemoLogin={() => { sessionApi.logout(); navigate('#/') }} />}
        {route.page === 'games' && <GamesPage isDemo={sessionApi.session.isDemo} onNavigate={navigate} />}
        {route.page === 'game' && <GameStudioPage key={route.gameId} gameId={route.gameId} isDemo={sessionApi.session.isDemo} onNavigate={navigate} />}
        {route.page === 'lesson' && (
          <LessonRoutePage
            key={route.chapter}
            chapter={route.chapter}
            initialSection={route.section}
            sessionApi={sessionApi}
            onNavigate={navigate}
            onOpenNotes={() => setNotesOpen(true)}
          />
        )}
        {route.page === 'assessment' && (
          route.mode === 'final' ? <FinalAssessmentRoutePage
            key={`${route.chapter}-${route.mode}`}
            chapter={route.chapter}
            sessionApi={sessionApi}
            onNavigate={navigate}
          /> : <PracticeAssessmentRoutePage
            key={`${route.chapter}-${route.mode}`}
            chapter={route.chapter}
            mode="practice"
            sessionApi={sessionApi}
            onNavigate={navigate}
          />
        )}
        {route.page === 'map' && <CurriculumMap sessionApi={sessionApi} isDemo={sessionApi.session.isDemo} onNavigate={navigate} />}
        {route.page === 'graph-lab' && (
          <GraphLabPage
            initialLesson={route.lesson ?? (sessionApi.session.isDemo ? 1 : sessionApi.session.lastChapter)}
            isAdmin={sessionApi.session.userRole === 'admin'}
            isDemo={sessionApi.session.isDemo}
            onNavigate={navigate}
          />
        )}
        {route.page === 'recap-tests' && <RecapTestsPage sessionApi={sessionApi} isDemo={sessionApi.session.isDemo} onNavigate={navigate} />}
        {route.page === 'admission-tests' && <AdmissionTestsPage isDemo={sessionApi.session.isDemo} onNavigate={navigate} />}
        {route.page === 'admission-assessment' && <AdmissionAssessmentPage testId={route.testId} sessionApi={sessionApi} onNavigate={navigate} />}
        {route.page === 'admin-reports' && sessionApi.session.userRole === 'admin' && <AdminReportsPage adminDataApi={adminDataApi} />}
        {route.page === 'profile' && (
          <ProfilePage
            sessionApi={sessionApi}
            appearanceApi={appearanceApi}
            adminStats={{
              students: adminDataApi.students.length,
              online: adminDataApi.students.filter((student) => student.isOnline).length,
              reports: adminDataApi.reports.length,
            }}
            onNavigate={navigate}
          />
        )}
        {route.page === 'recap-assessment' && (
          <PracticeAssessmentRoutePage
            key={`recap-${route.chapter}`}
            chapter={route.chapter}
            mode="recap"
            sessionApi={sessionApi}
            onNavigate={navigate}
          />
        )}
        </>}
      </Suspense>
      <NotesDrawer
        open={notesOpen}
        notes={sessionApi.session.notes}
        onClose={() => setNotesOpen(false)}
        onSave={sessionApi.saveNotes}
      />
    </AppShell>
  )
}
