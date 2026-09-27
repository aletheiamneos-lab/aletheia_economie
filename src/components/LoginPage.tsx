import { useState, type FormEvent } from 'react'
import { ArrowRight, BookOpenText, ChartNoAxesCombined, Eye, EyeOff, Folder, GraduationCap, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import type { UserRole } from '../types'
import { ADMIN_QUICK_ACCESS_ENABLED, DEFAULT_ADMIN_PASSWORD, DEMO_ADMIN_EMAIL, getAdminPassword, hasCustomAdminPassword } from '../preferences'

interface LoginPageProps {
  onLogin: (user: { name: string; email: string; role: UserRole }) => string | null
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export function LoginPage({ onLogin }: LoginPageProps) {
  const [role, setRole] = useState<UserRole>('student')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const customAdminPassword = hasCustomAdminPassword()

  const selectRole = (nextRole: UserRole) => {
    setRole(nextRole)
    if (nextRole === 'admin' && !ADMIN_QUICK_ACCESS_ENABLED && !password && !customAdminPassword) setPassword(DEFAULT_ADMIN_PASSWORD)
    setError('')
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const safeEmail = role === 'admin' && ADMIN_QUICK_ACCESS_ENABLED ? DEMO_ADMIN_EMAIL : email.trim()
    if (role === 'student' && name.trim().length < 3) {
      setError('Introdu numele complet pentru a continua.')
      return
    }
    if (!emailPattern.test(safeEmail)) {
      setError('Introdu o adresă de e-mail validă.')
      return
    }
    if (role === 'admin' && !ADMIN_QUICK_ACCESS_ENABLED && password !== getAdminPassword()) {
      setError(customAdminPassword ? 'Parola de administrator nu este corectă.' : `Parola demo este ${DEFAULT_ADMIN_PASSWORD}.`)
      return
    }
    const loginError = onLogin({ name: role === 'student' ? name : 'Administrator', email: safeEmail, role })
    setError(loginError ?? '')
  }

  const isAdmin = role === 'admin'

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
              <h2 id="login-title">{isAdmin ? 'Spațiul administratorului' : 'Bun venit la studiu'}</h2>
              <p>{isAdmin ? 'Un singur punct de acces pentru administrarea platformei.' : 'Completează datele și continuă de unde ai rămas.'}</p>
            </div>
          </header>

          <div className="login-role-tabs" role="tablist" aria-label="Tipul contului">
            <button type="button" role="tab" aria-selected={!isAdmin} className={!isAdmin ? 'active' : ''} onClick={() => selectRole('student')}>
              <GraduationCap size={16}/> Elev
            </button>
            <button type="button" role="tab" aria-selected={isAdmin} className={isAdmin ? 'active' : ''} onClick={() => selectRole('admin')}>
              <ShieldCheck size={16}/> Administrator
            </button>
          </div>

          <form className="login-form" onSubmit={submit} noValidate>
            {!isAdmin && (
              <label>
                <span>Nume complet</span>
                <div className="login-input-shell"><UserRound size={16}/><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Andrei Popescu" autoComplete="name" autoFocus/></div>
              </label>
            )}
            {(!isAdmin || !ADMIN_QUICK_ACCESS_ENABLED) && <label>
              <span>Adresă de e-mail</span>
              <div className="login-input-shell"><Mail size={16}/><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={isAdmin ? DEMO_ADMIN_EMAIL : 'elev@exemplu.ro'} autoComplete="email" autoFocus={isAdmin}/></div>
            </label>}
            {isAdmin && !ADMIN_QUICK_ACCESS_ENABLED && (
              <label>
                <span className="login-field-heading">Parolă <small>{customAdminPassword ? 'Parolă personalizată' : <>Demo: <b>{DEFAULT_ADMIN_PASSWORD}</b></>}</small></span>
                <div className="login-input-shell"><LockKeyhole size={16}/><input aria-label="Parolă" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={customAdminPassword ? 'Introdu parola' : DEFAULT_ADMIN_PASSWORD} autoComplete="current-password"/><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ascunde parola' : 'Arată parola'}>{showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}</button></div>
              </label>
            )}

            {error && <p className="login-error" role="alert">{error}</p>}

            <button className="login-submit" type="submit">
              <span>{isAdmin ? 'Intră ca administrator' : 'Intră în spațiul de studiu'}</span>
              <ArrowRight size={17}/>
            </button>
          </form>

          <footer className="login-access-note">
            {isAdmin ? <LockKeyhole size={14}/> : <ShieldCheck size={14}/>}
            <span>{isAdmin ? (ADMIN_QUICK_ACCESS_ENABLED ? 'Acces rapid temporar pentru etapa de prototip · fără e-mail și fără parolă.' : customAdminPassword ? 'Folosește parola administrativă salvată pe acest dispozitiv.' : `Prototip local · parola demo este ${DEFAULT_ADMIN_PASSWORD}.`) : 'Datele rămân doar în sesiunea curentă pe acest dispozitiv.'}</span>
          </footer>
        </section>
      </section>
      <p className="login-footer">Economie by A mentor <span/> Învățare structurată, fără zgomot.</p>
    </main>
  )
}
