import {
  Braces,
  CalendarDays,
  Check,
  ImageDown,
  Lightbulb,
  Printer,
  Sigma,
  Sparkles,
} from 'lucide-react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { parseMathScripts, parseMathText, replaceMathSymbols } from '../mathText'

interface MathDraft {
  title: string
  content: string
  createdAt: string
}

const storageKey = 'economia-math-workspace-v1'
const initialContent = `# Împărțim în părți egale
O clasă are 24 de elevi, împărțiți în 4 grupe.

Elevi într-o grupă = {24 elevi}/{4 grupe} = 6 elevi

> Numărătorul arată totalul, iar numitorul arată numărul de grupe.

# Indice și putere
Prețul inițial = P_{0}, iar cantitatea la pătrat = Q^{2}`

function createStarterDraft(): MathDraft {
  return {
    title: 'Fracțiile — exemplu simplu',
    content: initialContent,
    createdAt: new Date().toISOString(),
  }
}

function loadDraft(): MathDraft {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null') as Partial<MathDraft> | null
    if (saved && typeof saved.title === 'string' && typeof saved.content === 'string') {
      return {
        title: saved.title,
        content: saved.content,
        createdAt: typeof saved.createdAt === 'string' ? saved.createdAt : new Date().toISOString(),
      }
    }
  } catch {
    // Pornim cu exemplul atunci când stocarea locală nu este disponibilă.
  }
  return createStarterDraft()
}

function formatCreatedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Data nu este disponibilă'
  return new Intl.DateTimeFormat('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function ScriptedText({ value }: { value: string }) {
  return (
    <>
      {parseMathScripts(replaceMathSymbols(value)).map((token, index) => {
        if (token.type === 'superscript') return <sup key={`sup-${index}`}>{token.value}</sup>
        if (token.type === 'subscript') return <sub key={`sub-${index}`}>{token.value}</sub>
        return <Fragment key={`text-${index}`}>{token.value}</Fragment>
      })}
    </>
  )
}

function MathInline({ value }: { value: string }) {
  return (
    <>
      {parseMathText(value).map((token, index) => token.type === 'fraction' ? (
        <span className="rendered-fraction" key={`${token.numerator}-${token.denominator}-${index}`}>
          <span><ScriptedText value={token.numerator} /></span>
          <span><ScriptedText value={token.denominator} /></span>
        </span>
      ) : (
        <ScriptedText value={token.value} key={`${token.value}-${index}`} />
      ))}
    </>
  )
}

function PreviewLine({ line, index }: { line: string; index: number }) {
  const trimmed = line.trim()
  if (!trimmed) return <div className="math-preview-space" aria-hidden="true" />
  if (trimmed.startsWith('# ')) return <h2><MathInline value={trimmed.slice(2)} /></h2>
  if (trimmed.startsWith('> ')) return <aside className="math-explanation"><Lightbulb size={16}/><span><MathInline value={trimmed.slice(2)} /></span></aside>
  if (trimmed.startsWith('- ')) return <div className="math-bullet"><span>•</span><p><MathInline value={trimmed.slice(2)} /></p></div>
  const hasMath = /[=+×÷^_]|\{.+\}\/\{.+\}|[\p{L}\d.,%]+\s*\/\s*[\p{L}\d.,%]+/u.test(trimmed)
  return <p className={hasMath ? 'math-equation-line' : 'math-prose-line'} data-line={index + 1}><MathInline value={line} /></p>
}

function safeFilename(value: string) {
  return (value || 'explicatie-matematica')
    .replace(/[^a-zA-Z0-9ăâîșțĂÂÎȘȚ -]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

async function elementAsPng(element: HTMLElement) {
  if ('fonts' in document) await document.fonts.ready
  const { default: html2canvas } = await import('html2canvas')
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false,
    width: element.scrollWidth,
    height: element.scrollHeight,
  })
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Imaginea nu a putut fi creată')), 'image/png')
  })
}

export function MathWorkspacePage() {
  const [draft, setDraft] = useState<MathDraft>(loadDraft)
  const [saved, setSaved] = useState(true)
  const [exporting, setExporting] = useState(false)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const paperRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setSaved(false)
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(draft))
      } catch {
        // Documentul rămâne utilizabil și fără stocare locală.
      }
      setSaved(true)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [draft])

  const insertAtCursor = (value: string, selection?: [number, number]) => {
    const editor = editorRef.current
    const start = editor?.selectionStart ?? draft.content.length
    const end = editor?.selectionEnd ?? start
    const nextContent = `${draft.content.slice(0, start)}${value}${draft.content.slice(end)}`
    setDraft((current) => ({ ...current, content: nextContent }))
    window.requestAnimationFrame(() => {
      editor?.focus()
      editor?.setSelectionRange(start + (selection?.[0] ?? value.length), start + (selection?.[1] ?? value.length))
    })
  }

  const downloadImage = async () => {
    if (!paperRef.current || exporting) return
    setExporting(true)
    try {
      const blob = await elementAsPng(paperRef.current)
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${safeFilename(draft.title)}.png`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch {
      window.alert('Imaginea nu a putut fi creată. Încearcă din nou sau folosește opțiunea PDF.')
    } finally {
      setExporting(false)
    }
  }

  const printPdf = () => {
    const oldTitle = document.title
    document.title = draft.title.trim() || 'Fișă de matematică'
    window.print()
    document.title = oldTitle
  }

  const lines = draft.content.split('\n')

  return (
    <section className="math-workspace-page">
      <div className="math-workspace-intro">
        <div className="math-intro-icon"><Sigma size={23}/></div>
        <div>
          <span className="page-kicker">Ecuații</span>
          <h1>Scrie simplu, explică vizual.</h1>
        </div>
        <div className="math-save-state" role="status"><Check size={14}/>{saved ? 'Salvat automat' : 'Se salvează…'}</div>
      </div>

      <div className="math-composer-toolbar" aria-label="Instrumente matematice">
        <span><Sparkles size={15}/> Inserează</span>
        <button className="fraction-tool" onClick={() => insertAtCursor('{numărător}/{numitor}', [1, 10])}>
          <span><i>a</i><i>b</i></span> Fracție
        </button>
        <button onClick={() => insertAtCursor(' = ')}>=</button>
        <button onClick={() => insertAtCursor(' + ')}>+</button>
        <button onClick={() => insertAtCursor(' − ')}>−</button>
        <button onClick={() => insertAtCursor(' × ')}>×</button>
        <button onClick={() => insertAtCursor(' ÷ ')}>÷</button>
        <button className="script-tool" onClick={() => insertAtCursor('_{indice}', [2, 8])} title="Scrie un indice jos"><span>x<sub>n</sub></span> Indice jos</button>
        <button className="script-tool" onClick={() => insertAtCursor('^{putere}', [2, 8])} title="Scrie o putere sus"><span>x<sup>n</sup></span> Putere sus</button>
        <button onClick={() => insertAtCursor('\n# Titlu nou', [3, 12])}><Braces size={14}/> Titlu</button>
        <button onClick={() => insertAtCursor('\n> Explicație pentru elev', [3, 25])}><Lightbulb size={14}/> Explicație</button>
      </div>

      <div className="math-workspace-grid">
        <section className="math-editor-card">
          <div className="math-card-heading">
            <div><span>01</span><div><b>Scrie aici</b><small>Ca într-un caiet obișnuit</small></div></div>
            <span className="math-syntax-hint">Fracție: {'{total}/{număr}'}</span>
          </div>
          <label className="math-title-field">
            <span>Titlul fișei</span>
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} aria-label="Titlul fișei" />
          </label>
          <label className="math-content-field">
            <span>Conținut</span>
            <textarea
              ref={editorRef}
              value={draft.content}
              onChange={(event) => setDraft((current) => ({ ...current, content: event.target.value }))}
              aria-label="Conținut matematic"
              spellCheck="true"
              placeholder={'Scrie un enunț sau o formulă, de exemplu:\nP_{0} = {preț total}/{număr produse}'}
            />
          </label>
          <div className="math-editor-tip"><Lightbulb size={15}/><span>Scrie <b>3/4</b> pentru o fracție rapidă. Pentru <b>P<sub>0</sub></b>, apasă <b>Indice jos</b>.</span></div>
        </section>

        <section className="math-preview-card">
          <div className="math-card-heading math-preview-heading">
            <div><span>02</span><div><b>Pagina elevului</b><small>Previzualizare în timp real</small></div></div>
            <div className="math-preview-actions">
              <button onClick={downloadImage} disabled={exporting}><ImageDown size={14}/>{exporting ? 'Se pregătește…' : 'Descarcă imagine'}</button>
              <button onClick={printPdf}><Printer size={14}/>PDF</button>
            </div>
          </div>
          <div className="math-preview-scroll">
            <article ref={paperRef} className="math-paper" aria-label="Previzualizare fișă matematică">
              <div className="math-paper-topline">
                <div className="math-paper-mark"><Sigma size={18}/><span>FIȘĂ DE LUCRU</span></div>
                <div className="math-paper-date"><CalendarDays size={13}/><span>Creat: {formatCreatedAt(draft.createdAt)}</span></div>
              </div>
              <h1>{draft.title.trim() || 'Fișă de matematică'}</h1>
              <div className="math-paper-rule" />
              <div className="math-paper-content">
                {lines.map((line, index) => <PreviewLine line={line} index={index} key={`${index}-${line}`} />)}
              </div>
              <footer><span>Economie by A mentor</span><span>Matematică explicată simplu</span></footer>
            </article>
          </div>
        </section>
      </div>
    </section>
  )
}
