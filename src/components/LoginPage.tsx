import { useState, type FormEvent } from 'react'
import { ArrowRight, BookOpenText, ChartNoAxesCombined, Eye, EyeOff, Folder, GraduationCap, LockKeyhole, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react'

export type LoginMode = 'student' | 'demo' | 'admin'

export interface LoginRequest {
  role: LoginMode
  name: string
  email: string
  password: string
}

interface LoginPageProps {
  onLogin: (request: LoginRequest) => Promise<string | null>
  notice?: string
  adminOnly?: boolean
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function LoginPage({ onLogin, notice, adminOnly = false }: LoginPageProps) {
  const [chosenRole, setRole] = useState<LoginMode>('student')
  const role: LoginMode = adminOnly ? 'admin' : chosenRole
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const selectRole = (nextRole: LoginMode) => {
    setRole(nextRole)
    setError('')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (role === 'student') {
      if (name.trim().length < 3) {
        setError('Introdu numele complet pentru a continua.')
        return
      }
      if (!emailPattern.test(email.trim())) {
        setError('Introdu o adresă de e-mail validă.')
        return
      }
    } else if (role === 'admin' && !password) {
      setError('Introdu parola de administrator.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const loginError = await onLogin({ role, name: name.trim(), email: email.trim().toLowerCase(), password })
      setError(loginError ?? '')
    } finally {
      setBusy(false)
    }
  }

  const isAdmin = role === 'admin'
  const isDemo = role === 'demo'

  return (
    <main className="login-page">
      <div className="login-grid" aria-hidden="true" />
      <section className="login-layout">
        <div className="login-brand-panel">
          <div className="login-brand-lockup" aria-label="Economie by A mentor">
            <span className="login-folder-mark">
              <Folder aria-hidden="true" />
              <b>E</b>
            </span>
            <span className="login-brand-copy">
              <strong>Economie</strong>
              <small>by A mentor</small>
            </span>
          </div>

          <div className="login-brand-message">
            <span className="login-kicker">Platformă educațională</span>
            <h1>Economia devine <em>clară.</em></h1>
            <p>Teorie structurată, grafice interactive și evaluări complete, într-un singur spațiu de studiu.</p>
          </div>

          <div className="login-feature-row" aria-label="Conținutul platformei">
            <span><BookOpenText size={15}/><b>19</b> capitole</span>
            <span><ChartNoAxesCombined size={15}/><b>87</b> grafice</span>
            <span><GraduationCap size={15}/><b>36</b> teste admitere</span>
          </div>
        </div>

        <section className={`login-access-card ${isAdmin ? 'is-admin' : ''}`} aria-labelledby="login-title">
          <header className="login-access-heading">
            <span className="login-access-icon">{isAdmin ? <ShieldCheck size={21}/> : <UserRound size={21}/>}</span>
            <div>
              <span className="login-kicker">Acces în platformă</span>
              <h2 id="login-title">{isAdmin ? 'Spațiul administratorului' : isDemo ? 'Explorează în modul Demo' : 'Bun venit la studiu'}</h2>
              <p>{isAdmin ? 'Un singur punct de acces pentru administrarea platformei.' : isDemo ? 'Primele două capitole, fără cont. Rezultatele nu se salvează.' : 'Completează datele și continuă de unde ai rămas.'}</p>
            </div>
          </header>

          {!adminOnly && <div className="login-role-tabs" role="tablist" aria-label="Tipul accesului">
            <button type="button" role="tab" aria-selected={role === 'student'} className={role === 'student' ? 'active' : ''} onClick={() => selectRole('student')}>
              <GraduationCap size={16}/> Elev
            </button>
            <button type="button" role="tab" aria-selected={isDemo} className={isDemo ? 'active' : ''} onClick={() => selectRole('demo')}>
              <Sparkles size={16}/> Demo
            </button>
          </div>}

          <form className="login-form" onSubmit={submit} noValidate>
            {role === 'student' && (
              <label>
                <span>Nume complet</span>
                <div className="login-input-shell"><UserRound size={16}/><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Andrei Popescu" autoComplete="name" autoFocus/></div>
              </label>
            )}
            {role === 'student' && <label>
              <span>Adresă de e-mail</span>
              <div className="login-input-shell"><Mail size={16}/><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="elev@exemplu.ro" autoComplete="email"/></div>
            </label>}
            {isAdmin && (
              <label>
                <span>Parolă</span>
                <div className="login-input-shell"><LockKeyhole size={16}/><input aria-label="Parolă" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Introdu parola" autoComplete="current-password" autoFocus/><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div>
              </label>
            )}

            {notice && !error && <p className="login-error" role="status">{notice}</p>}
            {error && <p className="login-error" role="alert">{error}</p>}

            <button className="login-submit" type="submit" disabled={busy} aria-busy={busy}>
              <span>{busy ? 'Se verifică accesul… (prima conectare poate dura până la un minut)' : isAdmin ? 'Intră ca administrator' : isDemo ? 'Intră în modul Demo' : 'Intră în spațiul de studiu'}</span>
              <ArrowRight size={17}/>
            </button>
          </form>

          <footer className="login-access-note">
            {isAdmin ? <LockKeyhole size={14}/> : <ShieldCheck size={14}/>}
            <span>{isAdmin ? 'Accesul administratorului este verificat pe server.' : isDemo ? 'Pentru acces complet, cere profesorului aprobarea adresei tale de e-mail.' : 'Intră cu adresa de e-mail aprobată de profesor.'}</span>
          </footer>
        </section>
      </section>
      <p className="login-footer">Economie by A mentor <span/> Învățare structurată, fără zgomot.</p>
    </main>
  )
}
