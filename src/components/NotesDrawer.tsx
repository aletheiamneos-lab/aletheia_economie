import { Check, NotebookPen, X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface NotesDrawerProps {
  open: boolean
  notes: string
  onClose: () => void
  onSave: (notes: string) => void
}

export function NotesDrawer({ open, notes, onClose, onSave }: NotesDrawerProps) {
  const [draft, setDraft] = useState(notes)
  const [saved, setSaved] = useState(false)

  useEffect(() => setDraft(notes), [notes, open])
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const save = () => {
    onSave(draft)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  return (
    <>
      <button className={`drawer-scrim ${open ? 'is-visible' : ''}`} onClick={onClose} aria-label="Închide notițele" tabIndex={open ? 0 : -1} />
      <aside className={`notes-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open} aria-label="Notițele mele">
        <div className="drawer-header">
          <div>
            <span className="eyebrow"><NotebookPen size={15} /> Spațiul tău</span>
            <h2>Notițe personale</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Închide"><X size={20} /></button>
        </div>
        <p className="drawer-intro">Notițele rămân disponibile numai în sesiunea curentă și se resetează la reîncărcarea paginii. Scrie definiții, întrebări sau legături pe care vrei să le revezi.</p>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={'Exemplu:\n• Costul de oportunitate = cea mai bună alternativă abandonată\n• De revăzut: clasificarea bunurilor'}
        />
        <div className="drawer-actions">
          <span>{draft.length} caractere</span>
          <button className="button button-primary" onClick={save}>
            {saved ? <><Check size={17} /> Păstrat în sesiune</> : 'Păstrează în sesiune'}
          </button>
        </div>
      </aside>
    </>
  )
}
