import {
  BookOpen,
  Activity,
  ChartNoAxesCombined,
  ClipboardCheck,
  ChevronLeft,
  CircleUserRound,
  Folder,
  Gamepad2,
  GraduationCap,
  GalleryHorizontalEnd,
  LibraryBig,
  LockKeyhole,
  Home,
  LogOut,
  Map,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Sigma,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { chapters } from '../data/catalog'
import type { SessionApi } from '../session'
import type { Route } from '../types'

interface AppShellProps {
  children: ReactNode
  route: Route
  sessionApi: SessionApi
  onNavigate: (path: string) => void
  onLogout: () => void
}

export function AppShell({ children, route, sessionApi, onNavigate, onLogout }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('economia-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })
  const { session } = sessionApi
  const activeChapterNumber = route.page === 'lesson' || route.page === 'assessment' || route.page === 'recap-assessment'
    ? route.chapter
    : route.page === 'graph-lab' && route.lesson
      ? route.lesson
      : session.lastChapter
  const activeChapter = chapters.find((chapter) => chapter.number === activeChapterNumber) ?? chapters[0]

  useEffect(() => setMobileOpen(false), [route])

  // Pe telefon, pagina din spate nu se mai derulează cât timp meniul e deschis.
  useEffect(() => {
    if (!mobileOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [mobileOpen])

  useEffect(() => {
    try {
      window.localStorage.setItem('economia-sidebar-collapsed', String(sidebarCollapsed))
    } catch {
      // The layout still works when local storage is unavailable.
    }
  }, [sidebarCollapsed])

  const isHome = route.page === 'dashboard'
  const isLibrary = route.page === 'library'
  const isLearning = route.page === 'lessons' || route.page === 'lesson' || route.page === 'assessment'
  const isGraphLab = route.page === 'graph-lab'
  const isMathWorkspace = route.page === 'math-workspace'
  const isFlashcards = route.page === 'flashcards'
  const isRecap = route.page === 'recap-tests' || route.page === 'recap-assessment'
  const isAdmission = route.page === 'admission-tests' || route.page === 'admission-assessment'
  const isGames = route.page === 'games' || route.page === 'game'
  const isProfile = route.page === 'profile'
  const isAdminReports = route.page === 'admin-reports'
  const isAdmin = session.userRole === 'admin'

  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMathWorkspace ? 'math-workspace-shell' : ''} ${isFlashcards ? 'flashcards-shell' : ''} ${route.page === 'game' ? 'game-player-shell' : ''}`}>
      <header className="mobile-topbar">
        <button className="mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Deschide meniul" aria-expanded={mobileOpen}>
          <Menu size={21} />
        </button>
        <button className="mobile-topbar-brand" onClick={() => onNavigate('#/')} aria-label="Economie — acasă">
          <span className="brand-folder"><Folder size={26}/><b>E</b></span>
          <span><strong>Economie</strong><small>{session.isDemo ? 'Mod Demo' : 'by A mentor'}</small></span>
        </button>
        <button className="mobile-topbar-profile" onClick={() => onNavigate('#/profil')} aria-label="Profil">
          {(session.userName || (isAdmin ? 'Administrator' : 'Elev')).split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
        </button>
      </header>
      {mobileOpen && <button className="nav-scrim" onClick={() => setMobileOpen(false)} aria-label="Închide meniul" />}

      <aside className={`main-sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <button
          className="desktop-sidebar-toggle"
          onClick={() => setSidebarCollapsed((value) => !value)}
          aria-label={sidebarCollapsed ? 'Extinde bara laterala' : 'Restrange bara laterala'}
          title={sidebarCollapsed ? 'Extinde bara laterala' : 'Restrange bara laterala'}
        >
          {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        </button>
        <div className="brand-row">
          <button className="brand" onClick={() => onNavigate('#/')} aria-label="Acasă">
            <span className="brand-folder"><Folder size={37}/><b>E</b></span>
            <span className="brand-copy"><strong>Economie</strong><small>by A mentor</small></span>
          </button>
          <button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Închide meniul"><X size={20} /></button>
        </div>

        <nav className="primary-nav" aria-label="Navigare principală">
          <span className="nav-segment-label">Start</span>
          <button className={isHome ? 'active' : ''} onClick={() => onNavigate('#/')} title={sidebarCollapsed ? 'Acasă' : undefined} aria-label="Acasă">
            <Home size={17} /> <span className="nav-copy"><b>Acasă</b><small>Panoul general</small></span>
          </button>
          <button className={isLibrary ? 'active' : ''} onClick={() => onNavigate('#/biblioteca')} title={sidebarCollapsed ? 'Biblioteca' : undefined} aria-label="Biblioteca">
            <LibraryBig size={17} /> <span className="nav-copy"><b>Biblioteca {session.isDemo && <LockKeyhole className="nav-demo-lock" size={11}/>}</b><small>Manuale PDF</small></span>
          </button>
          <span className="nav-segment-label">Studiu</span>
          <button className={isLearning ? 'active' : ''} onClick={() => onNavigate('#/lectii')} title={sidebarCollapsed ? 'Lecții' : undefined} aria-label="Lecții">
            <BookOpen size={17} /> <span className="nav-copy"><b>Lecții</b><small>Teorie și practică</small></span>
          </button>
          <button className={route.page === 'map' ? 'active' : ''} onClick={() => onNavigate('#/harta')} title={sidebarCollapsed ? 'Harta materiei' : undefined} aria-label="Harta materiei">
            <Map size={17} /> <span className="nav-copy"><b>Harta materiei</b><small>Parcurs vizual</small></span>
          </button>
          <button className={isFlashcards ? 'active' : ''} onClick={() => onNavigate('#/flashcarduri')} title={sidebarCollapsed ? 'Flashcarduri' : undefined} aria-label="Flashcarduri">
            <GalleryHorizontalEnd size={17} /> <span className="nav-copy"><b>Flashcarduri</b><small>3.600 de întrebări</small></span>
          </button>
          <button className={isGraphLab ? 'active' : ''} onClick={() => onNavigate(`#/grafice/${session.isDemo && activeChapter.number > 2 ? 1 : activeChapter.number}`)} title={sidebarCollapsed ? 'Grafice interactive' : undefined} aria-label="Grafice interactive">
            <ChartNoAxesCombined size={17} /> <span className="nav-copy"><b>Grafice</b><small>Laborator economic</small></span>
          </button>
          <button className={isMathWorkspace ? 'active' : ''} onClick={() => onNavigate('#/caiet-matematic')} title={sidebarCollapsed ? 'Ecuații' : undefined} aria-label="Ecuații">
            <Sigma size={17} /> <span className="nav-copy"><b>Ecuații {session.isDemo && <LockKeyhole className="nav-demo-lock" size={11}/>}</b><small>Fracții, indici și puteri</small></span>
          </button>
          <span className="nav-segment-label">Experiențe</span>
          <button className={isGames ? 'active' : ''} onClick={() => onNavigate('#/jocuri')} title={sidebarCollapsed ? 'Jocuri economice' : undefined} aria-label="Jocuri economice">
            <Gamepad2 size={17} /> <span className="nav-copy"><b>Jocuri</b><small>10 simulări economice</small></span>
          </button>
          <span className="nav-segment-label">Evaluare</span>
          <button className={isRecap ? 'active' : ''} onClick={() => onNavigate('#/teste-recapitulative')} title={sidebarCollapsed ? 'Teste recapitulative' : undefined} aria-label="Teste recapitulative">
            <ClipboardCheck size={17} /> <span className="nav-copy"><b>Teste recapitulative</b><small>19 capitole</small></span>
          </button>
          <button className={isAdmission ? 'active' : ''} onClick={() => onNavigate('#/teste-admitere')} title={sidebarCollapsed ? 'Teste de admitere' : undefined} aria-label="Teste de admitere">
            <GraduationCap size={17} /> <span className="nav-copy"><b>Admitere</b><small>Seturi complete</small></span>
          </button>
          {isAdmin && <>
            <span className="nav-segment-label">Administrare</span>
            <button className={isAdminReports ? 'active' : ''} onClick={() => onNavigate('#/admin/rapoarte')} title={sidebarCollapsed ? 'Rapoarte și acces' : undefined} aria-label="Rapoarte și acces">
              <Activity size={17} /> <span className="nav-copy"><b>Rapoarte</b><small>Elevi și activitate</small></span>
            </button>
          </>}
        </nav>

        <div className="sidebar-footer">
          <button className={`sidebar-profile-card ${isProfile ? 'active' : ''}`} onClick={() => onNavigate('#/profil')} title="Deschide profilul">
            <span className="profile-avatar">{isAdmin ? <ShieldCheck size={19}/> : <CircleUserRound size={20}/>}</span>
            <span className="sidebar-profile-copy"><b>{session.userName || (isAdmin ? 'Administrator' : 'Profil elev')}{session.isDemo && <i className="sidebar-demo-badge">Demo</i>}</b><small>{isAdmin ? 'Administrator' : 'Elev'}</small></span>
            <ChevronLeft className="arrow-right" size={15}/>
          </button>
          <button className="sidebar-logout-button" onClick={onLogout} title="Deconectare" aria-label="Deconectare">
            <LogOut size={15}/><span>Deconectare</span>
          </button>
        </div>
      </aside>

      <main className="app-main">{children}</main>
    </div>
  )
}
