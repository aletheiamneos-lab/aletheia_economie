import { Download, Eye, EyeOff, FileText, LibraryBig, LoaderCircle, Maximize2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { apiRequest, getLibraryLink } from '../api'

interface LibraryResource {
  id: string
  group: 'capitole' | 'manuale'
  chapter?: number
  label?: string
  title: string
  fileName: string
  url?: string
  size: number
}

interface LibraryManifest {
  resources: LibraryResource[]
}

function formatSize(bytes: number) {
  const megabytes = bytes / 1024 / 1024
  return megabytes >= 10 ? `${megabytes.toFixed(0)} MB` : `${megabytes.toFixed(1)} MB`
}

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
}: {
  resource: LibraryResource
  hidden: boolean
  isAdmin: boolean
  busy: boolean
  onPreview: () => void
  onDownload: () => void
  onToggleVisibility: () => void
}) {
  return (
    <article className={`library-resource ${hidden ? 'is-hidden' : ''}`}>
      <button className="library-cover" onClick={onPreview} aria-label={`Previzualizează ${resource.title}`}>
        <span className="library-cover-fallback"><FileText size={34}/><b>PDF</b></span>
        <span className="library-cover-hover"><Maximize2 size={18}/> Deschide</span>
      </button>

      <div className="library-resource-tags">
        <span>{resource.label ?? (resource.chapter ? `Capitolul ${resource.chapter}` : 'Manual integral')}</span>
        {hidden && <span className="hidden-label"><EyeOff size={10}/> Ascuns elevilor</span>}
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
      const url = await getLibraryLink(resource.fileName)
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
      resources: resources.filter((resource) => resource.group === 'capitole' && (isAdmin || !hiddenResources.includes(resource.id))),
    },
    {
      id: 'manuale' as const,
      kicker: 'Manuale integrale',
      title: 'Manuale de economie',
      description: 'Manuale, formule și exerciții pentru aprofundare și recapitulare.',
      resources: resources.filter((resource) => resource.group === 'manuale' && (isAdmin || !hiddenResources.includes(resource.id))),
    },
  ], [hiddenResources, isAdmin, resources])

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
