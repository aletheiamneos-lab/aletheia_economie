import { AlertCircle, Layers3, LoaderCircle, LockKeyhole, Palette, Settings2, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { collectGraphExportSnapshot, downloadGraphPdf, downloadGraphPng } from '../graphExport'

interface ManifestLesson {
  lesson: number
  title: string
  html: string
  json: string
  modules: string[]
  moduleCount: number
}

interface GraphManifest {
  version: string
  uiBaseline: string
  moduleCount: number
  lessons: ManifestLesson[]
}

interface GraphModule {
  id: string
  title: string
  kind: string
  defaults: Record<string, unknown>
  formulas?: string[]
  provenance?: {
    status: 'A' | 'B' | 'C'
    statusLegend?: string
  }
}

interface LessonIntegration {
  packageVersion: string
  lesson: number
  title: string
  sourceAudit: {
    moduleCount: number
    modules: Array<{ id: string; status: 'A' | 'B' | 'C'; formulas?: string[] }>
  }
  config: {
    lesson: number
    title: string
    modules: GraphModule[]
    themeDefaults?: Record<string, string>
    [key: string]: unknown
  }
}

interface GraphLabPageProps {
  initialLesson: number
  isAdmin: boolean
  onNavigate: (path: string) => void
}

interface GraphAdminSettings {
  showExplanations: boolean
  showFormulas: boolean
}

const graphRoot = `${import.meta.env.BASE_URL}graph-lab`
const adminStorageKey = 'eco_graph_admin_v1'
const defaultAdminSettings: GraphAdminSettings = { showExplanations: true, showFormulas: true }

function loadAdminSettings(): GraphAdminSettings {
  try {
    const saved = JSON.parse(window.localStorage.getItem(adminStorageKey) ?? '{}') as Partial<GraphAdminSettings>
    return {
      showExplanations: saved.showExplanations ?? true,
      showFormulas: saved.showFormulas ?? true,
    }
  } catch {
    return defaultAdminSettings
  }
}

const embeddedTheme = `
  :root{--bg:#f5f7fa;--ink:#1d2945;--muted:#6f7b94;--line:#dce2ee;--blue:#163a59;--green:#318d9c;--amber:#b68725;--red:#bd4d4d;--shadow:0 8px 22px rgba(29,41,69,.055)}
  html,body{background:linear-gradient(180deg,#f9fafc 0%,#f4f7fa 100%);font-family:"DM Sans",Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;overflow:hidden}
  .topbar{position:static!important;background:#fff;border-color:#e4e9f1;backdrop-filter:none}
  .topinner{max-width:1540px;padding:9px 12px;gap:8px;align-items:center}
  .topinner .brand{color:#163a59;min-width:150px}
  .topinner .ctrl{min-width:min(430px,42vw)}
  .topinner .ctrl select{width:100%;border-color:#d7dfeb;border-radius:9px;color:#1d2945;box-shadow:0 1px 2px rgba(29,41,69,.03)}
  .topinner>.btn.reset{color:#a3463c;background:#fff5f2;border-color:#f1cbc5}
  .topinner>.btn.export{color:#163a59;background:#f2f7fa;border-color:#cad9e5;font-weight:750}
  .topinner>.btn.labels.active{color:#fff;background:#163a59;border-color:#163a59}
  .topinner>.badge{margin-left:2px}
  .page{max-width:1540px;padding:10px 12px 16px}
  .pagehead{display:none!important}
  .badge{color:#225779;background:#edf6f8;border-color:#cce2e7}
  .modebar,.comparebar,.graphCard,.sidePanel,.bottomCard,.placeholder{border-color:#dfe5ee;box-shadow:0 6px 18px rgba(29,41,69,.045)}
  .modebar{padding:10px 12px;border-color:#cbd8e5;background:#fff}
  .modebar.is-empty,.comparebar.is-empty{display:none!important}
  .modebar .label{color:#163a59}
  .modebar .seg button{min-height:34px;padding:7px 13px}
  .graphCard,.sidePanel,.bottomCard,.placeholder{border-radius:14px}
  .panelSection,.metric{background:#f8fafc;border-color:#e5eaf1}
  .seg button.active,.statusPill.active{color:#fff;background:#163a59}
  .explain{background:#f3f8fa;border-color:#d6e7eb}
  .provenance-c{color:#8a5b14!important;background:#fff8e8!important;border-color:#ead9ad!important}
  .sidePanel{position:static!important;max-height:none!important;overflow:visible!important}
  .formulas-hidden .formula,.formulas-hidden .formula-only-section,.formulas-hidden #dEqText,.formulas-hidden #sEqText,.formulas-hidden #applyDEq,.formulas-hidden #applySEq,.formulas-hidden [data-mode="equation"]{display:none!important}
  #themeBtn,#adminBtn{display:none!important}
  @media (min-width:761px) and (max-width:1100px){.workspace{grid-template-columns:minmax(0,1fr) 290px}}
  @media (max-width:760px){html,body{overflow:hidden}.topinner .brand{min-width:0}.topinner .ctrl{width:100%;min-width:100%;order:5}.workspace{grid-template-columns:1fr}.sidePanel{position:static;max-height:none}.page{padding:9px}}
`

function assertIntegration(manifest: GraphManifest, manifestLesson: ManifestLesson, integration: LessonIntegration) {
  const configIds = integration.config.modules.map((module) => module.id)
  const auditIds = integration.sourceAudit.modules.map((module) => module.id)
  if (integration.packageVersion !== manifest.version || integration.lesson !== manifestLesson.lesson || integration.config.lesson !== manifestLesson.lesson) {
    throw new Error('Versiunea sau numărul lecției nu corespunde manifestului V5.4.')
  }
  if (integration.sourceAudit.moduleCount !== manifestLesson.moduleCount || configIds.length !== manifestLesson.moduleCount) {
    throw new Error('Numărul modulelor nu corespunde contractului lecției.')
  }
  if (configIds.join('|') !== manifestLesson.modules.join('|') || auditIds.join('|') !== configIds.join('|')) {
    throw new Error('Ordinea sau identificatorii modulelor diferă între manifest, audit și configurație.')
  }
  integration.config.modules.forEach((module, index) => {
    const auditModule = integration.sourceAudit.modules[index]
    if (!module.provenance || module.provenance.status !== auditModule.status || !['A', 'B', 'C'].includes(module.provenance.status)) {
      throw new Error(`Proveniența modulului ${module.id} nu respectă contractul.`)
    }
    if (JSON.stringify(module.formulas ?? []) !== JSON.stringify(auditModule.formulas ?? [])) {
      throw new Error(`Formulele modulului ${module.id} diferă de auditul sursă.`)
    }
  })
}

function integrationDocument(integration: LessonIntegration, isAdmin: boolean) {
  const safeConfig = JSON.stringify(integration.config).replace(/</g, '\\u003c')
  const bridgeScript = `
    document.addEventListener('DOMContentLoaded',()=>{
      const select=document.getElementById('moduleSelect');
      const badge=document.getElementById('statusBadge');
      const labelsButton=document.getElementById('dataLabelsBtn');
      const labelsKey='eco_graph_labels_v1';
      let labelsEnabled=localStorage.getItem(labelsKey)!=='false';
      const adminSettings=(()=>{try{return JSON.parse(localStorage.getItem('eco_graph_admin_v1')||'{}')}catch{return{}}})();
      if(adminSettings.showFormulas===false)document.body.classList.add('formulas-hidden');
      const update=()=>{
        const module=window.LESSON_CONFIG.modules[Number(select.value)||0];
        const status=module&&module.provenance&&module.provenance.status;
        const labels={A:'A · din material',B:'B · derivat din material',C:'C · vizualizare didactică'};
        badge.textContent=labels[status]||'model interactiv';
        badge.classList.toggle('provenance-c',status==='C');
      };
      const syncDataLabels=()=>{
        labelsButton.textContent=labelsEnabled?'Etichete date: DA':'Etichete date: NU';
        labelsButton.classList.toggle('active',labelsEnabled);
        const svg=document.querySelector('#plot,.graphCard svg,#content svg');
        if(!svg)return;
        const metrics=[...document.querySelectorAll('.metric')].slice(0,6).map(metric=>({label:(metric.querySelector('small')?.textContent||'Indicator').trim(),value:(metric.querySelector('b')?.textContent||'—').trim()}));
        const signature=metrics.map(item=>item.label+'='+item.value).join('|');
        const existing=svg.querySelector('#graphDataLabels');
        if(!labelsEnabled){if(existing)existing.remove();return}
        if(existing&&existing.dataset.signature===signature)return;
        if(existing)existing.remove();
        if(!metrics.length)return;
        const ns='http://www.w3.org/2000/svg';
        const group=document.createElementNS(ns,'g');
        group.id='graphDataLabels';
        group.dataset.signature=signature;
        const box=svg.viewBox&&svg.viewBox.baseVal;
        const scaleX=(box&&box.width?box.width:960)/960;
        const scaleY=(box&&box.height?box.height:540)/540;
        group.setAttribute('transform','scale('+scaleX+' '+scaleY+')');
        metrics.forEach((item,index)=>{
          const x=92+index*128;
          const rect=document.createElementNS(ns,'rect');
          rect.setAttribute('x',String(x));rect.setAttribute('y','10');rect.setAttribute('width','119');rect.setAttribute('height','30');rect.setAttribute('rx','5');rect.setAttribute('fill','#ffffff');rect.setAttribute('stroke','#d8e2ea');rect.setAttribute('opacity','.96');
          const label=document.createElementNS(ns,'text');
          label.setAttribute('x',String(x+6));label.setAttribute('y','21');label.setAttribute('fill','#69758a');label.setAttribute('font-size','6.8');label.textContent=item.label.length>18?item.label.slice(0,17)+'…':item.label;
          const value=document.createElementNS(ns,'text');
          value.setAttribute('x',String(x+6));value.setAttribute('y','34');value.setAttribute('fill','#163a59');value.setAttribute('font-size','8.5');value.setAttribute('font-weight','800');value.textContent=item.value.length>18?item.value.slice(0,17)+'…':item.value;
          group.append(rect,label,value);
        });
        svg.append(group);
      };
      const syncFormulaVisibility=()=>{
        if(adminSettings.showFormulas!==false)return;
        document.querySelectorAll('.panelSection').forEach(section=>section.classList.toggle('formula-only-section',Boolean(section.querySelector(':scope > .formula'))&&!section.querySelector('input,select,table')));
        document.querySelectorAll('.sideTitle b').forEach(title=>{if(title.textContent.includes('ecuații'))title.textContent=title.textContent.replace(' și ecuații','')});
      };
      const syncFunctionalBars=()=>{
        const modebar=document.getElementById('modebar');
        const comparebar=document.getElementById('comparebar');
        modebar.classList.toggle('is-empty',!modebar.querySelector('button,input,select'));
        comparebar.classList.toggle('is-empty',!comparebar.querySelector('button,input,select'));
      };
      const reportHeight=()=>parent.postMessage({type:'economia:graph-height',height:Math.ceil(document.documentElement.scrollHeight)},'*');
      select.addEventListener('change',()=>requestAnimationFrame(()=>{update();syncDataLabels();reportHeight()}));
      labelsButton.addEventListener('click',()=>{labelsEnabled=!labelsEnabled;localStorage.setItem(labelsKey,String(labelsEnabled));syncDataLabels()});
      ${isAdmin ? "document.getElementById('pngExportBtn').addEventListener('click',()=>parent.postMessage({type:'economia:export-graph',format:'png'},'*'));document.getElementById('pdfExportBtn').addEventListener('click',()=>parent.postMessage({type:'economia:export-graph',format:'pdf'},'*'));" : ''}
      new MutationObserver(()=>requestAnimationFrame(()=>{syncFormulaVisibility();syncFunctionalBars();syncDataLabels()})).observe(document.getElementById('content'),{childList:true,subtree:true});
      update();
      syncFormulaVisibility();
      syncFunctionalBars();
      syncDataLabels();
      if(window.ResizeObserver)new ResizeObserver(reportHeight).observe(document.body);
      window.addEventListener('load',reportHeight);
      requestAnimationFrame(reportHeight);
    });
  `.replace(/<\/script/gi, '<\\/script')

  return `<!doctype html>
<html lang="ro"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="${graphRoot}/assets/graph-lab.css"><style>${embeddedTheme}</style>
<title>Economie — Grafice interactive</title></head><body>
<header class="topbar"><div class="topinner"><div class="brand"><span id="lessonLabel"></span><small id="lessonTitleTop"></small></div><div class="ctrl"><label>Grafic / concept</label><select id="moduleSelect"></select></div><span class="badge" id="statusBadge"></span><div class="grow"></div><button class="btn reset" id="resetBtn">↶ Revenire grafic</button><button class="btn labels" id="dataLabelsBtn">Etichete date</button>${isAdmin ? '<button class="btn export" id="pngExportBtn">↓ PNG</button><button class="btn export" id="pdfExportBtn">↓ PDF</button>' : ''}<button class="btn" id="resetLessonBtn">↺ Reset lecție</button><button class="btn" id="themeBtn" aria-hidden="true">Aspect</button><button class="btn" id="adminBtn" aria-hidden="true">Admin</button></div></header>
<main class="page"><div class="pagehead"><div><h1 id="pageTitle"></h1><div class="subtitle" id="pageSubtitle"></div></div></div><div class="modebar" id="modebar"></div><div class="comparebar" id="comparebar"></div><div id="content"></div></main>
<div class="modalBack" id="themeModal"><div class="modal"><div class="modalHead"><b>Culorile graficelor</b><button class="btn closeModal" data-modal="themeModal">Închide</button></div><div class="modalBody"><p class="help">Culorile se aplică tuturor celor 19 lecții.</p><div id="themeBody"></div></div></div></div>
<div class="modalBack" id="adminModal"><div class="modal"><div class="modalHead"><b>Setări administrator</b><button class="btn closeModal" data-modal="adminModal">Închide</button></div><div class="modalBody"><div class="toggleRow"><div><b style="font-size:12px">Afișează explicațiile elevilor</b></div><div class="toggle" id="expToggle"></div></div><div class="toggleRow"><div><b style="font-size:12px">Afișează formulele</b></div><div class="toggle" id="formulaToggle"></div></div></div></div></div>
<div class="toast" id="toast"></div><script>window.LESSON_CONFIG=${safeConfig};<\/script><script src="${graphRoot}/assets/graph-engine.js"><\/script><script>${bridgeScript}<\/script></body></html>`
}

export function GraphLabPage({ initialLesson, isAdmin, onNavigate }: GraphLabPageProps) {
  const [manifest, setManifest] = useState<GraphManifest | null>(null)
  const [selectedLesson, setSelectedLesson] = useState(initialLesson)
  const [integration, setIntegration] = useState<LessonIntegration | null>(null)
  const [error, setError] = useState('')
  const [frameHeight, setFrameHeight] = useState(760)
  const [frameRevision, setFrameRevision] = useState(0)
  const [adminSettings, setAdminSettings] = useState<GraphAdminSettings>(loadAdminSettings)
  const [adminPanelOpen, setAdminPanelOpen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const exportBusyRef = useRef(false)

  useEffect(() => setSelectedLesson(initialLesson), [initialLesson])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${graphRoot}/data/manifest.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Manifestul V5.4 nu a putut fi încărcat.')
        return response.json() as Promise<GraphManifest>
      })
      .then((data) => {
        if (data.version !== '5.4.0' || data.lessons.length !== 19 || data.moduleCount !== 87) {
          throw new Error('Manifestul nu corespunde pachetului V5.4 complet.')
        }
        setManifest(data)
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : 'Manifest invalid.')
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!manifest) return
    const manifestLesson = manifest.lessons.find((lesson) => lesson.lesson === selectedLesson)
    if (!manifestLesson) {
      setError('Lecția selectată nu există în manifest.')
      return
    }
    const controller = new AbortController()
    setIntegration(null)
    setFrameHeight(760)
    setError('')
    fetch(`${graphRoot}/integration/lesson_${String(selectedLesson).padStart(2, '0')}.integration.json`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Contractul lecției nu a putut fi încărcat.')
        return response.json() as Promise<LessonIntegration>
      })
      .then((data) => {
        assertIntegration(manifest, manifestLesson, data)
        setIntegration(data)
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : 'Contract invalid.')
      })
    return () => controller.abort()
  }, [manifest, selectedLesson])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      if (event.data?.type === 'economia:graph-height') {
        const nextHeight = Number(event.data.height)
        if (Number.isFinite(nextHeight)) setFrameHeight(Math.max(620, Math.min(4000, nextHeight + 2)))
        return
      }
      if (event.data?.type !== 'economia:export-graph' || !isAdmin || !integration || exportBusyRef.current) return
      const format = event.data.format === 'pdf' ? 'pdf' : 'png'
      const frameDocument = iframeRef.current?.contentDocument
      if (!frameDocument) return
      const moduleIndex = Number((frameDocument.getElementById('moduleSelect') as HTMLSelectElement | null)?.value ?? 0)
      const configuredFormulas = integration.config.modules[moduleIndex]?.formulas ?? []
      const toast = frameDocument.getElementById('toast')
      const showToast = (message: string) => {
        if (!toast) return
        toast.textContent = message
        toast.classList.add('show')
        window.setTimeout(() => toast.classList.remove('show'), 2200)
      }
      exportBusyRef.current = true
      showToast(format === 'pdf' ? 'Se pregătește raportul PDF…' : 'Se pregătește imaginea PNG…')
      try {
        const snapshot = collectGraphExportSnapshot(frameDocument, {
          chapterNumber: integration.lesson,
          chapterTitle: integration.title,
          configuredFormulas,
        })
        const operation = format === 'pdf' ? downloadGraphPdf(snapshot) : downloadGraphPng(snapshot)
        void operation
          .then(() => showToast(format === 'pdf' ? 'Raportul PDF a fost descărcat.' : 'Imaginea PNG a fost descărcată.'))
          .catch((reason: unknown) => showToast(reason instanceof Error ? reason.message : 'Exportul nu a putut fi realizat.'))
          .finally(() => { exportBusyRef.current = false })
      } catch (reason) {
        exportBusyRef.current = false
        showToast(reason instanceof Error ? reason.message : 'Exportul nu a putut fi realizat.')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [integration, isAdmin])

  const srcDoc = useMemo(() => integration ? integrationDocument(integration, isAdmin) : '', [integration, isAdmin])
  const currentManifestLesson = manifest?.lessons.find((lesson) => lesson.lesson === selectedLesson)

  const chooseLesson = (lesson: number) => {
    setSelectedLesson(lesson)
    setAdminPanelOpen(false)
    onNavigate(`#/grafice/${lesson}`)
  }

  const updateAdminSetting = (setting: keyof GraphAdminSettings, enabled: boolean) => {
    const next = { ...adminSettings, [setting]: enabled }
    setAdminSettings(next)
    window.localStorage.setItem(adminStorageKey, JSON.stringify(next))
    setFrameRevision((revision) => revision + 1)
  }

  const openColorControls = () => {
    iframeRef.current?.contentDocument?.getElementById('themeBtn')?.click()
  }

  return (
    <section className="graph-lab-page page-enter">
      <div className="graph-lab-selector-bar">
        <div className="graph-lab-toolbar-title">
          <h1>Grafice interactive</h1>
        </div>
        <div className="graph-lab-select-wrap">
          <label htmlFor="graphLessonSelect">Lecție</label>
          <select
            id="graphLessonSelect"
            value={selectedLesson}
            disabled={!manifest}
            onChange={(event) => chooseLesson(Number(event.target.value))}
          >
            {(manifest?.lessons ?? []).map((lesson) => (
              <option key={lesson.lesson} value={lesson.lesson}>Capitolul {String(lesson.lesson).padStart(2, '0')} · {lesson.title}</option>
            ))}
          </select>
        </div>
        <div className="graph-lab-actions">
          <span className="graph-lab-module-count"><Layers3 size={15}/>{currentManifestLesson?.moduleCount ?? '—'} grafice</span>
          <button type="button" className="graph-lab-tool-button" onClick={openColorControls} disabled={!integration}>
            <Palette size={16}/> Culori grafice
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`graph-lab-tool-button graph-admin-open-button ${adminPanelOpen ? 'is-active' : ''}`}
              aria-expanded={adminPanelOpen}
              onClick={() => setAdminPanelOpen((open) => !open)}
            >
              <Settings2 size={16}/> Control profesor
            </button>
          )}
        </div>
      </div>

      {isAdmin && adminPanelOpen && (
        <section className="graph-admin-panel" aria-label="Control profesor">
          <div className="graph-admin-title">
            <span><ShieldCheck size={17}/></span>
            <div><b>Control profesor</b><small>Vizibil numai administratorului</small></div>
          </div>
          <div className="graph-admin-switches">
            <button
              type="button"
              className={adminSettings.showExplanations ? 'is-enabled' : 'is-locked'}
              aria-pressed={adminSettings.showExplanations}
              onClick={() => updateAdminSetting('showExplanations', !adminSettings.showExplanations)}
            >
              <span>Explicații pentru elevi</span>
              <b>{adminSettings.showExplanations ? 'Vizibile' : 'Blocate'}</b>
            </button>
            <button
              type="button"
              className={adminSettings.showFormulas ? 'is-enabled' : 'is-locked'}
              aria-pressed={adminSettings.showFormulas}
              onClick={() => updateAdminSetting('showFormulas', !adminSettings.showFormulas)}
            >
              <span>Formule și ecuații</span>
              <b>{adminSettings.showFormulas ? 'Vizibile' : 'Blocate'}</b>
            </button>
          </div>
          <div className="graph-admin-note"><LockKeyhole size={14}/> Setările se aplică imediat în laborator.</div>
        </section>
      )}

      <div className={`graph-lab-frame-shell ${integration ? 'is-ready' : ''}`}>
        {!integration && !error && <div className="graph-lab-loading"><LoaderCircle className="spin" size={25}/><b>Pregătim laboratorul…</b></div>}
        {error && <div className="graph-lab-error"><AlertCircle size={23}/><div><b>Laboratorul nu poate fi afișat</b><p>{error}</p></div></div>}
        {integration && (
          <iframe
            ref={iframeRef}
            key={`${selectedLesson}-${isAdmin ? 'admin' : 'student'}-${frameRevision}`}
            className="graph-lab-frame"
            style={{ height: `${frameHeight}px` }}
            title={`Grafice interactive — Capitolul ${selectedLesson}: ${integration.title}`}
            srcDoc={srcDoc}
          />
        )}
      </div>
    </section>
  )
}
