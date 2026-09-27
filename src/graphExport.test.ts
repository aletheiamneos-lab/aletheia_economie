/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { buildImagePdf, collectGraphExportSnapshot } from './graphExport'

describe('graph export', () => {
  it('collects the active graph, calculated indicators, parameters and hidden configured formulas', () => {
    document.body.innerHTML = `
      <section class="graphCard">
        <div class="graphHead"><h2>Cerere și ofertă</h2><small>Echilibrul pieței</small></div>
        <svg id="plot" viewBox="0 0 960 540"></svg>
        <div class="metrics"><div class="metric"><small>Preț echilibru</small><b>25</b></div></div>
      </section>
      <aside class="sidePanel">
        <div class="field"><label>Intercept cerere</label><input id="aInput" value="120"></div>
        <input id="dEqText" value="Qd = 120 - 2P">
      </aside>`

    const snapshot = collectGraphExportSnapshot(document, {
      chapterNumber: 8,
      chapterTitle: 'Piața — cererea și oferta',
      configuredFormulas: ['Qd = a − bP', 'Qo = c + dP'],
    })

    expect(snapshot.graphTitle).toBe('Cerere și ofertă')
    expect(snapshot.indicators).toEqual([{ label: 'Preț echilibru', value: '25' }])
    expect(snapshot.parameters).toContainEqual({ label: 'Intercept cerere', value: '120' })
    expect(snapshot.formulas).toEqual(expect.arrayContaining(['Qd = a − bP', 'Qo = c + dP', 'Qd = 120 - 2P']))
  })

  it('builds a self-contained PDF with embedded JPEG pages', async () => {
    const pdf = buildImagePdf([
      { width: 20, height: 30, jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) },
      { width: 20, height: 30, jpeg: new Uint8Array([0xff, 0xd8, 0xff, 0xd9]) },
    ])
    const bytes = new Uint8Array(await pdf.arrayBuffer())
    const text = new TextDecoder('latin1').decode(bytes)

    expect(pdf.type).toBe('application/pdf')
    expect(text.startsWith('%PDF-1.4')).toBe(true)
    expect(text).toContain('/Count 2')
    expect(text).toContain('/Subtype /Image')
    expect(text).toContain('xref')
    expect(text.endsWith('%%EOF')).toBe(true)
  })

  it('creates an exportable SVG for the non-SVG economic process diagram', () => {
    document.body.innerHTML = `
      <div class="graphHead"><h2>Fazele activității</h2></div>
      <div class="processRow">
        <button class="processBox">1. Producție</button>
        <button class="processBox active">2. Repartiție</button>
        <button class="processBox">3. Schimb</button>
        <button class="processBox">4. Consum</button>
      </div>`

    const snapshot = collectGraphExportSnapshot(document, {
      chapterNumber: 2,
      chapterTitle: 'Activitatea economică',
      configuredFormulas: [],
    })

    expect(snapshot.svg.getAttribute('viewBox')).toBe('0 0 960 540')
    expect(snapshot.svg.textContent).toContain('Producție')
    expect(snapshot.svg.textContent).toContain('Repartiție')
    expect(snapshot.svg.querySelectorAll('rect')).toHaveLength(5)
  })
})
