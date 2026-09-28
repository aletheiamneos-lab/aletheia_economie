import { CheckCircle2, Download, Eye, EyeOff, FileText, LibraryBig, LoaderCircle, Maximize2, Upload, X, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { apiRequest, getLibraryLink, uploadLibraryFile } from '../api'

interface LibraryResource {
  id: string
  group: 'capitole' | 'manuale'
  chapter?: number
  label?: string
  title: string
  fileName: string
  url?: string
  size: number
  /** true = PDF-ul e inclus în aplicație (public/library), ca la logică */
  available?: boolean
}

interface LibraryManifest {
  resources: LibraryResource[]
}

function formatSize(bytes: number) {
  const megabytes = bytes / 1024 / 1024
  return megabytes >= 10 ? `${megabytes.toFixed(0)} MB` : `${megabytes.toFixed(1)} MB`
}

const plain = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[þţ]/gi, 't').replace(/[ºş]/gi, 's').toLowerCase()

/** Potrivește un fișier de pe calculator (orice nume) cu documentul din bibliotecă. */
export function matchLibraryResource(originalName: string, resources: LibraryResource[]): LibraryResource | null {
  const name = plain(originalName)
  const chapter = name.match(/cap(?:itol(?:ul)?)?[\s._-]*0*(\d{1,2})(?!\d)/)
  if (chapter) return resources.find((resource) => resource.group === 'capitole' && resource.chapter === Number(chapter[1])) ?? null
  const byKeyword: Array<[RegExp, string]> = [
    [/corint/, 'manual-economie-corint-2012.pdf'],
    [/breviar|formule/, 'breviar-complet-formule.pdf'],
    [/fara rezolvari|exercitii|culegere/, 'manual-exercitii-fara-rezolvari.pdf'],
    [/corvin/, 'manual-alternativ-1.pdf'],
    [/cosea/, 'manual-alternativ-2.pdf'],
    [/gavrila|nitescu|ghita/, 'manual-alternativ-3.pdf'],
    [/lacatus/, 'manual-alternativ-4.pdf'],
  ]
  const found = byKeyword.find(([pattern]) => pattern.test(name))
  if (found) return resources.find((resource) => resource.fileName === found[1]) ?? null
  const exact = resources.find((resource) => resource.fileName === name)
  return exact ?? null
}

interface UploadResult { name: string; target?: string; ok: boolean; message: string }

function withDownload(url: string, fileName: string) {
  return `${url}${url.includes('?') ? '&' : '?'}download=${encodeURIComponent(fileName)}`
}

function ResourceCard({
  resource,
  hidden,
  isAdmin,
  busy,
  onPreview,
  onDownload,
  onToggleVisibility,
  onUpload,
}: {
  resource: LibraryResource
  hidden: boolean
  isAdmin: boolean
  busy: boolean
  onPreview: () => void
  onDownload: () => void
  onToggleVisibility: () => void
  onUpload: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <article className={`library-resource ${hidden ? 'is-hidden' : ''}`}>
      <button className="library-cover" onClick={onPreview} aria-label={`Previzualizează ${resource.title}`}>
        <span className="library-cover-fallback"><FileText size={34}/><b>PDF</b></span>
        <span className="library-cover-hover"><Maximize2 size={18}/> Deschide</span>
      </button>

      <div className="library-resource-tags">
        <span>{resource.label ?? (resource.chapter ? `Capitolul ${resource.chapter}` : 'Manual integral')}</span>
        {hidden && <span className="hidden-label"><EyeOff size={10}/> Ascuns elevilor</span>}
        {isAdmin && resource.available === false && <span className="hidden-label">Lipsește din aplicație</span>}
      </div>
      <h3>{resource.title}</h3>
      <p>Document PDF · {formatSize(resource.size)}</p>

      <div className="library-card-actions">
        <button onClick={onPreview} disabled={busy}><Eye size={14}/> Preview</button>
        <button onClick={onDownload} disabled={busy}>{busy ? <LoaderCircle size={14}/> : <Download size={14}/>} Descarcă</button>
      </div>
      {isAdmin && <button className={`library-visibility ${hidden ? 'show' : ''}`} onClick={onToggleVisibility}>
          {hidden ? <Eye size={14}/> : <EyeOff size={14}/>}
          {hidden ? 'Arată elevilor' : 'Ascunde elevilor'}
        </button>}
      {isAdmin && <>
        <button className="library-visibility library-upload-one" onClick={() => inputRef.current?.click()} disabled={busy}>
          <Upload size={14}/> Încarcă / înlocuiește PDF
        </button>
        <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onUpload(file)
          event.target.value = ''
        }}/>
      </>}
    </article>
  )
}

export function LibraryPage({ isAdmin }: { isAdmin: boolean }) {
  const [resources, setResources] = useState<LibraryResource[]>([])
  const [hiddenFiles, setHiddenFiles] = useState<string[]>([])
  const [preview, setPreview] = useState<(LibraryResource & { url: string }) | null>(null)
  const [busyFile, setBusyFile] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const bulkInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    fetch('/library/manifest.json')
      .then((response) => {
        if (!response.ok) throw new Error('Biblioteca nu a putut fi încărcată.')
        return response.json() as Promise<LibraryManifest>
      })
      .then((manifest) => {
        if (active) setResources(manifest.resources)
      })
      .catch(() => {
        if (active) setError('Documentele nu au putut fi încărcate. Reîncearcă după reîmprospătarea paginii.')
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    apiRequest<{ hidden: string[] }>('/api/library/settings/visibility')
      .then((settings) => { if (active) setHiddenFiles(settings.hidden) })
      .catch(() => null)
    return () => { active = false }
  }, [])

  const hiddenResources = useMemo(
    () => resources.filter((resource) => hiddenFiles.includes(resource.fileName)).map((resource) => resource.id),
    [hiddenFiles, resources],
  )

  const openResource = async (resource: LibraryResource, action: 'preview' | 'download') => {
    setBusyFile(resource.fileName)
    setActionError('')
    try {
      // Documentele incluse în aplicație se deschid direct; celelalte se caută în Supabase Storage.
      const url = resource.available ? `/library/${resource.fileName}` : await getLibraryLink(resource.fileName)
      if (action === 'preview') setPreview({ ...resource, url })
      else window.location.assign(withDownload(url, resource.fileName))
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Documentul nu a putut fi deschis.')
    } finally {
      setBusyFile(null)
    }
  }

  useEffect(() => {
    if (!preview) return undefined
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreview(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [preview])

  const groups = useMemo(() => [
    {
      id: 'capitole' as const,
      kicker: 'Materiale PDF',
      title: 'Suporturi pe capitole',
      description: 'Materia structurată în 19 documente, în ordinea cursului.',
      resources: resources.filter((resource) => resource.group === 'capitole' && (isAdmin || (resource.available !== false && !hiddenResources.includes(resource.id)))),
    },
    {
      id: 'manuale' as const,
      kicker: 'Manuale integrale',
      title: 'Manuale de economie',
      description: 'Manuale, formule și exerciții pentru aprofundare și recapitulare.',
      resources: resources.filter((resource) => resource.group === 'manuale' && (isAdmin || (resource.available !== false && !hiddenResources.includes(resource.id)))),
    },
  ], [hiddenResources, isAdmin, resources])

  const uploadFiles = async (items: Array<{ file: File; target: LibraryResource | null }>) => {
    setUploading(true)
    setActionError('')
    const results: UploadResult[] = []
    for (const { file, target } of items) {
      if (!target) {
        results.push({ name: file.name, ok: false, message: 'Nu știu cărui document îi corespunde. Folosește „Încarcă / înlocuiește PDF” pe cardul potrivit.' })
        continue
      }
      if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
        results.push({ name: file.name, target: target.title, ok: false, message: 'Doar fișiere PDF.' })
        continue
      }
      setBusyFile(target.fileName)
      try {
        await uploadLibraryFile(target.fileName, file)
        results.push({ name: file.name, target: target.title, ok: true, message: `Încărcat ca ${target.label ?? (target.chapter ? `Capitolul ${target.chapter}` : 'manual')} · ${target.title}` })
      } catch (reason) {
        results.push({ name: file.name, target: target.title, ok: false, message: reason instanceof Error ? reason.message : 'Încărcarea a eșuat.' })
      } finally {
        setBusyFile(null)
      }
      setUploadResults([...results])
    }
    setUploadResults(results)
    setUploading(false)
  }

  const onBulkSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    if (files.length) void uploadFiles(files.map((file) => ({ file, target: matchLibraryResource(file.name, resources) })))
  }

  const toggleVisibility = async (resource: LibraryResource) => {
    const next = hiddenFiles.includes(resource.fileName)
      ? hiddenFiles.filter((name) => name !== resource.fileName)
      : [...hiddenFiles, resource.fileName]
    setHiddenFiles(next)
    try {
      const saved = await apiRequest<{ hidden: string[] }>('/api/admin/library/visibility', { method: 'PUT', body: { hidden: next } })
      setHiddenFiles(saved.hidden)
    } catch (reason) {
      setHiddenFiles(hiddenFiles)
      setActionError(reason instanceof Error ? reason.message : 'Vizibilitatea nu a putut fi salvată.')
    }
  }

  return (
    <div className="library-page page-enter">
      <header className="library-header">
        <div>
          <span className="page-kicker"><LibraryBig size={15}/> Biblioteca</span>
          <h1>Manuale și suporturi</h1>
          <p>{isAdmin ? 'Previzualizează, descarcă și gestionează materialele elevilor.' : 'Toate materialele cursului, într-un singur loc.'}</p>
        </div>
        <span className="library-visible-count">{isAdmin
          ? `${resources.length - hiddenResources.filter((id) => resources.some((resource) => resource.id === id)).length}/${resources.length || 26} vizibile elevilor`
          : `${resources.length || 26} resurse`}</span>
      </header>

      {isAdmin && (
        <section className="library-upload-panel" aria-label="Încarcă documente în bibliotecă">
          <div>
            <b>Încarcă documente</b>
            <p>Alege PDF-urile cu numele lor obișnuite (de ex. „Capitolul 6 - Costurile.pdf”). Aplicația recunoaște singură capitolul sau manualul și le dă numele intern corect.</p>
          </div>
          <button onClick={() => bulkInputRef.current?.click()} disabled={uploading || resources.length === 0}>
            {uploading ? <LoaderCircle size={16}/> : <Upload size={16}/>} {uploading ? 'Se încarcă…' : 'Alege PDF-uri'}
          </button>
          <input ref={bulkInputRef} type="file" accept="application/pdf,.pdf" multiple hidden onChange={onBulkSelected}/>
          {uploadResults.length > 0 && (
            <ul className="library-upload-results" aria-live="polite">
              {uploadResults.map((result, index) => (
                <li key={`${result.name}-${index}`} className={result.ok ? 'ok' : 'fail'}>
                  {result.ok ? <CheckCircle2 size={15}/> : <XCircle size={15}/>}
                  <span><b>{result.name}</b><small>{result.message}</small></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {error && <div className="library-error">{error}</div>}
      {actionError && <div className="library-error" role="alert">{actionError}</div>}

      {groups.map((group) => (
        <section className="library-group" key={group.id}>
          <header>
            <div><span>{group.kicker}</span><h2>{group.title}</h2><p>{group.description}</p></div>
            <b>{group.resources.length} resurse</b>
          </header>
          <div className="library-grid">
            {group.resources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                hidden={hiddenResources.includes(resource.id)}
                isAdmin={isAdmin}
                busy={busyFile === resource.fileName}
                onPreview={() => void openResource(resource, 'preview')}
                onDownload={() => void openResource(resource, 'download')}
                onToggleVisibility={() => void toggleVisibility(resource)}
                onUpload={(file) => void uploadFiles([{ file, target: resource }])}
              />
            ))}
          </div>
        </section>
      ))}

      {!error && resources.length === 0 && <div className="library-loading">Se încarcă biblioteca…</div>}

      {preview && (
        <div className="library-preview-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setPreview(null)
        }}>
          <section className="library-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="library-preview-title">
            <header>
              <div><span>Document PDF</span><h2 id="library-preview-title">{preview.title}</h2></div>
              <div>
                <a href={withDownload(preview.url, preview.fileName)}><Download size={15}/> Descarcă</a>
                <button onClick={() => setPreview(null)} aria-label="Închide previzualizarea"><X size={19}/></button>
              </div>
            </header>
            <iframe src={`${preview.url}#view=FitH`} title={`Previzualizare ${preview.title}`}/>
          </section>
        </div>
      )}
    </div>
  )
}
