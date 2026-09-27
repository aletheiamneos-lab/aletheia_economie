import { useState, type FormEvent, type ReactNode } from 'react'
import {
  Activity,
  ArrowRight,
  BookOpen,
  ChartNoAxesCombined,
  Check,
  ClipboardCheck,
  Clock3,
  Gamepad2,
  KeyRound,
  Library,
  Mail,
  Map,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Type,
  UserRound,
  UsersRound,
} from 'lucide-react'
import type { SessionApi } from '../session'
import { changeAdminPassword, fontOptions, themeOptions, type AppearanceApi } from '../preferences'

interface ProfilePageProps {
  sessionApi: SessionApi
  appearanceApi: AppearanceApi
  adminStats: { students: number; online: number; reports: number }
  onNavigate: (path: string) => void
}

const roleCopy = {
  student: {
    eyebrow: 'Cont de elev',
    title: 'Profilul meu',
    description: 'Progresul tău, activitatea recentă și toate instrumentele de studiu într-un singur loc.',
  },
  admin: {
    eyebrow: 'Administrator platformă',
    title: 'Panou administrativ',
    description: 'Controlează activitatea, accesul și identitatea vizuală a platformei.',
  },
}

function QuickPanel({ icon, eyebrow, title, description, label, primary = false, onClick }: {
  icon: ReactNode
  eyebrow: string
  title: string
  description: string
  label: string
  primary?: boolean
  onClick: () => void
}) {
  return (
    <section className={`profile-panel ${primary ? 'profile-primary-panel' : ''}`}>
      <span className="profile-panel-icon">{icon}</span>
      <div><span className="page-kicker">{eyebrow}</span><h2>{title}</h2><p>{description}</p></div>
      <button className={`button ${primary ? 'button-primary' : 'button-ghost'}`} onClick={onClick}>{label} <ArrowRight size={17}/></button>
    </section>
  )
}

export function ProfilePage({ sessionApi, appearanceApi, adminStats, onNavigate }: ProfilePageProps) {
  const role = sessionApi.session.userRole
  const isAdmin = role === 'admin'
  const copy = roleCopy[role]
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const updatePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Confirmarea nu coincide cu parola nouă.' })
      return
    }
    const error = changeAdminPassword(currentPassword, newPassword)
    if (error) {
      setPasswordMessage({ type: 'error', text: error })
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordMessage({ type: 'success', text: 'Parola administratorului a fost actualizată.' })
  }

  const activeTheme = themeOptions.find((option) => option.id === appearanceApi.preferences.theme)!
  const activeFont = fontOptions.find((option) => option.id === appearanceApi.preferences.font)!

  return (
    <div className={`profile-page page-enter ${isAdmin ? 'admin-view' : 'student-view'}`}>
      <header className="profile-hero">
        <div className="profile-identity">
          <span className="profile-large-avatar">{isAdmin ? <ShieldCheck size={34}/> : <UserRound size={36}/>}</span>
          <div><span className="page-kicker">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.description}</p></div>
        </div>
        <div className="profile-account-summary" aria-label="Cont conectat">
          <span>{isAdmin ? <ShieldCheck size={16}/> : <UserRound size={16}/>} {isAdmin ? 'Administrator' : 'Elev'}</span>
          <b>{sessionApi.session.userName}</b>
          <small><Mail size={13}/>{sessionApi.session.userEmail}</small>
        </div>
      </header>

      {!isAdmin ? (
        <>
          <section className="profile-stat-strip" aria-label="Progresul elevului">
            <div><BookOpen size={17}/><span><b>{sessionApi.session.completedChapters.length}<small>/ 19</small></b> capitole finalizate</span></div>
            <div><Check size={17}/><span><b>{sessionApi.session.completedSections.length}</b> secțiuni parcurse</span></div>
            <div><Sparkles size={17}/><span><b>{sessionApi.session.completedActivities.length}</b> activități rezolvate</span></div>
            <div><ClipboardCheck size={17}/><span><b>{sessionApi.session.completedRecapTests.length}</b> teste bifate</span></div>
          </section>

          <div className="profile-panel-grid student-profile-grid">
            <QuickPanel icon={<BookOpen size={22}/>} eyebrow="Învățare" title="Continuă lecția" description={`Revino la capitolul ${sessionApi.session.lastChapter}, exact de unde ai rămas.`} label="Deschide lecția" primary onClick={() => onNavigate(`#/capitol/${sessionApi.session.lastChapter}`)}/>
            <QuickPanel icon={<ClipboardCheck size={22}/>} eyebrow="Evaluare" title="Teste recapitulative" description="Alege unul dintre cele 19 teste și verifică materia." label="Vezi testele" onClick={() => onNavigate('#/teste-recapitulative')}/>
            <QuickPanel icon={<Gamepad2 size={22}/>} eyebrow="Exersare" title="Jocuri economice" description="Fixează conceptele prin simulări scurte și interactive." label="Deschide jocurile" onClick={() => onNavigate('#/jocuri')}/>
            <QuickPanel icon={<Map size={22}/>} eyebrow="Orientare" title="Harta materiei" description="Vezi traseul complet și capitolele care urmează." label="Vezi harta" onClick={() => onNavigate('#/harta')}/>
          </div>

          <section className="profile-session-card">
            <div className="profile-session-heading"><Clock3 size={19}/><div><span className="page-kicker">Sesiunea curentă</span><h2>Studiul tău este pregătit</h2></div></div>
            <div className="profile-session-details">
              <span><small>Ultimul capitol</small><b>Capitolul {sessionApi.session.lastChapter}</b></span>
              <span><small>Notițe personale</small><b>{sessionApi.session.notes.trim() ? 'Salvate' : 'Necompletate'}</b></span>
              <span><small>Aspect activ</small><b>{activeTheme.name}</b></span>
              <span><small>Font activ</small><b>{activeFont.name}</b></span>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="profile-stat-strip admin-stat-strip" aria-label="Rezumat administrativ">
            <div><UsersRound size={17}/><span><b>{adminStats.students}</b> elevi autorizați</span></div>
            <div><Activity size={17}/><span><b>{adminStats.online}</b> elevi online</span></div>
            <div><ClipboardCheck size={17}/><span><b>{adminStats.reports}</b> rapoarte disponibile</span></div>
            <div><ShieldCheck size={17}/><span><b>Activ</b> control acces</span></div>
          </section>

          <div className="profile-panel-grid admin-grid">
            <QuickPanel icon={<Activity size={22}/>} eyebrow="Rapoarte și acces" title="Activitatea elevilor" description="Rezultate, sesiuni și controlul accesului." label="Deschide rapoartele" primary onClick={() => onNavigate('#/admin/rapoarte')}/>
            <QuickPanel icon={<Library size={22}/>} eyebrow="Bibliotecă" title="Materialele cursului" description="Previzualizează și gestionează documentele elevilor." label="Deschide biblioteca" onClick={() => onNavigate('#/biblioteca')}/>
            <QuickPanel icon={<Gamepad2 size={22}/>} eyebrow="Jocuri" title="Simulări economice" description="Verifică experiențele interactive disponibile elevilor." label="Vezi jocurile" onClick={() => onNavigate('#/jocuri')}/>
            <QuickPanel icon={<ChartNoAxesCombined size={22}/>} eyebrow="Instrumente" title="Grafice interactive" description="Deschide laboratorul și comenzile profesorului." label="Deschide graficele" onClick={() => onNavigate(`#/grafice/${sessionApi.session.lastChapter}`)}/>
          </div>

          <section className="admin-settings-section" aria-labelledby="admin-settings-title">
            <header className="admin-settings-header">
              <div><span className="page-kicker">Setări platformă</span><h2 id="admin-settings-title">Personalizează experiența aplicației</h2><p>Culorile și fonturile se aplică imediat în toate paginile și rămân salvate pe acest dispozitiv.</p></div>
              <button className="settings-reset" type="button" onClick={appearanceApi.reset}><RotateCcw size={15}/> Revino la aspectul inițial</button>
            </header>

            <div className="admin-settings-grid">
              <div className="settings-column">
                <div className="settings-column-title"><Palette size={17}/><div><span>Tema aplicației</span><small>6 combinații atent echilibrate</small></div></div>
                <div className="settings-option-list">
                  {themeOptions.map((option) => {
                    const active = option.id === appearanceApi.preferences.theme
                    return (
                      <button key={option.id} type="button" className={`theme-option ${active ? 'active' : ''}`} onClick={() => appearanceApi.setTheme(option.id)} aria-pressed={active}>
                        <span className="theme-swatches" aria-hidden="true">{option.colors.map((color) => <i key={color} style={{ background: color }}/>)}</span>
                        <span className="settings-option-copy"><b>{option.name}</b><small>{option.description}</small></span>
                        <span className="settings-option-state">{active ? <><Check size={12}/> Activă</> : 'Selectează'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="settings-column">
                <div className="settings-column-title"><Type size={17}/><div><span>Fontul aplicației</span><small>Fontul actual + 6 alternative</small></div></div>
                <div className="settings-option-list">
                  {fontOptions.map((option) => {
                    const active = option.id === appearanceApi.preferences.font
                    return (
                      <button key={option.id} type="button" className={`font-option ${active ? 'active' : ''}`} onClick={() => appearanceApi.setFont(option.id)} aria-pressed={active}>
                        <span className="font-sample" style={{ fontFamily: option.previewFamily }}>Aa</span>
                        <span className="settings-option-copy"><b>{option.name}</b><small>{option.description}</small></span>
                        <span className="settings-option-state">{active ? <><Check size={12}/> Activ</> : 'Selectează'}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <form className="settings-column password-settings" onSubmit={updatePassword}>
                <div className="settings-column-title"><KeyRound size={17}/><div><span>Securizare</span><small>Accesul administratorului</small></div></div>
                <h3>Actualizează parola</h3>
                <p>Noua parolă trebuie să aibă minimum 8 caractere, cel puțin o literă și o cifră.</p>
                <label><span>Parola curentă</span><input aria-label="Parola curentă" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required/></label>
                <label><span>Parola nouă</span><input aria-label="Parola nouă" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required/></label>
                <label><span>Confirmă parola nouă</span><input aria-label="Confirmă parola nouă" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required/></label>
                {passwordMessage && <p className={`password-message ${passwordMessage.type}`} role="status">{passwordMessage.type === 'success' && <Check size={14}/>} {passwordMessage.text}</p>}
                <button className="button button-primary password-save" type="submit"><KeyRound size={15}/> Salvează parola</button>
                <div className="security-production-note"><ShieldCheck size={17}/><span><b>Notă pentru producție</b>Parola este stocată local în acest prototip. În producție va fi protejată prin autentificare și validare pe server.</span></div>
              </form>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
