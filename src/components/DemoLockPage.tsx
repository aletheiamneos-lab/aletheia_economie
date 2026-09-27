import { ArrowLeft, LockKeyhole, LogIn } from 'lucide-react'
import '../admission.css'

interface DemoLockPageProps {
  onBack: () => void
  onLogin: () => void
}

export function DemoLockPage({ onBack, onLogin }: DemoLockPageProps) {
  return (
    <div className="admission-state page-enter" role="region" aria-label="Conținut disponibil după autentificare">
      <LockKeyhole size={28}/>
      <h1>Disponibil cu cont de elev</h1>
      <p>În modul Demo poți explora capitolele 1 și 2, primul joc economic, graficele lecțiilor 1–2, primul set de flashcarduri Ușor și testul de admitere 2025 G1. Pentru restul platformei, intră cu adresa aprobată de profesor.</p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="button button-ghost" onClick={onBack}><ArrowLeft size={17}/> Înapoi</button>
        <button className="button button-primary" onClick={onLogin}><LogIn size={17}/> Autentificare elev</button>
      </div>
    </div>
  )
}
