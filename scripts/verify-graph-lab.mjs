import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const graphRoot = path.resolve(scriptDirectory, '../public/graph-lab')
const engineSource = await readFile(path.join(graphRoot, 'assets/graph-engine.js'), 'utf8')
const labStyles = await readFile(path.join(graphRoot, 'assets/graph-lab.css'), 'utf8')
const manifest = JSON.parse(await readFile(path.join(graphRoot, 'data/manifest.json'), 'utf8'))

const shell = `<!doctype html><html><body>
  <header><span id="lessonLabel"></span><small id="lessonTitleTop"></small><select id="moduleSelect"></select>
    <button id="resetBtn"></button><button id="resetLessonBtn"></button><button id="themeBtn"></button><button id="adminBtn"></button>
  </header>
  <main><h1 id="pageTitle"></h1><div id="pageSubtitle"></div><span id="statusBadge"></span><div id="modebar"></div><div id="comparebar"></div><div id="content"></div></main>
  <div id="themeModal"><div id="themeBody"></div></div><div id="adminModal"></div><button class="closeModal" data-modal="themeModal"></button>
  <div id="expToggle"></div><div id="formulaToggle"></div><div id="toast"></div>
</body></html>`

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function expectedState(module) {
  const values = clone(module.defaults ?? {})
  let anchor = null
  if (module.defaultAnchor && module.kind === 'two_curve') {
    const y = Number(values.probe ?? 0)
    anchor = {
      y,
      qd: Number(values.a ?? 0) - Number(values.b ?? 0) * y,
      qs: Number(values.c ?? 0) + Number(values.d ?? 0) * y,
    }
  }
  return {
    values,
    t0: clone(values),
    t0Anchored: false,
    anchor,
    mode: values.startMode || 'probe',
    visible: {},
    meta: {},
  }
}

function storageKey(lesson, moduleId) {
  return `eco_graph_l${lesson}_${moduleId}_v1`
}

function dispatchChange(window, element) {
  element.dispatchEvent(new window.Event('change', { bubbles: true }))
}

assert.equal(manifest.version, '5.4.0')
assert.equal(manifest.lessons.length, 19)
assert.equal(manifest.moduleCount, 87)

let renderedModules = 0
let exportableGraphs = 0
const modulesWithoutSvg = []
let graphResets = 0
let lessonResets = 0
let movementChecks = 0
let parallelShiftChecks = 0
let comparisonChecks = 0
let abChecks = 0

assert.ok(engineSource.includes("eco_graph_theme_v1"), 'Cheia temei globale există')
assert.ok(engineSource.includes("eco_graph_admin_v1"), 'Cheia setărilor administrative există')
assert.ok(!/(openai|chatgpt|anthropic|gemini|fetch\s*\()/i.test(engineSource), 'Motorul nu folosește AI sau servicii externe')
assert.ok(labStyles.includes('grid-template-columns:minmax(0,1fr) 340px'), 'Layout V5: grafic mare și panou permanent')

for (const manifestLesson of manifest.lessons) {
  const number = String(manifestLesson.lesson).padStart(2, '0')
  const integration = JSON.parse(await readFile(path.join(graphRoot, `integration/lesson_${number}.integration.json`), 'utf8'))
  const config = integration.config

  assert.equal(integration.packageVersion, manifest.version)
  assert.equal(config.lesson, manifestLesson.lesson)
  assert.deepEqual(config.modules.map((module) => module.id), manifestLesson.modules)
  assert.equal(config.modules.length, manifestLesson.moduleCount)
  assert.deepEqual(integration.sourceAudit.modules.map((module) => module.id), manifestLesson.modules)

  for (let index = 0; index < config.modules.length; index += 1) {
    const module = config.modules[index]
    const auditModule = integration.sourceAudit.modules[index]
    assert.equal(module.provenance.status, auditModule.status, `Proveniență ${number}/${module.id}`)
    assert.ok(['A', 'B', 'C'].includes(module.provenance.status), `Status valid ${number}/${module.id}`)
    assert.deepEqual(module.formulas ?? [], auditModule.formulas ?? [], `Formule ${number}/${module.id}`)
  }

  const dom = new JSDOM(shell, {
    runScripts: 'outside-only',
    url: `http://economia.local/graph-lab/lessons/lesson_${number}.html`,
    pretendToBeVisual: true,
  })
  const { window } = dom
  window.LESSON_CONFIG = clone(config)
  window.localStorage.setItem('eco_graph_theme_v1', JSON.stringify({ graphBg: '#123456', line1: '#abcdef' }))
  window.eval(engineSource)
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'))

  const moduleSelect = window.document.querySelector('#moduleSelect')
  const resetButton = window.document.querySelector('#resetBtn')
  const resetLessonButton = window.document.querySelector('#resetLessonBtn')
  assert.equal(moduleSelect.options.length, config.modules.length, `Dropdown lecția ${number}`)

  for (let index = 0; index < config.modules.length; index += 1) {
    const module = config.modules[index]
    const key = storageKey(config.lesson, module.id)
    window.localStorage.removeItem(key)
    moduleSelect.value = String(index)
    dispatchChange(window, moduleSelect)

    assert.ok(window.document.querySelector('#content .workspace'), `Renderer ${number}/${module.id}`)
    assert.ok(!window.document.querySelector('#content .placeholder'), `Fără placeholder ${number}/${module.id}`)
    if (window.document.querySelector('#plot, .graphCard svg, #content svg, .processRow')) exportableGraphs += 1
    else modulesWithoutSvg.push(`${number}/${module.id}`)
    assert.ok(window.document.querySelector('.graphHead h2')?.textContent, `Titlu export ${number}/${module.id}`)
    assert.deepEqual(JSON.parse(window.localStorage.getItem(key)), expectedState(module), `Stare inițială ${number}/${module.id}`)
    renderedModules += 1

    if (module.kind === 'two_curve') {
      const structuralBefore = JSON.parse(window.localStorage.getItem(key)).values
      const probeButton = window.document.querySelector('[data-mode="probe"]')
      probeButton.click()
      const probeInput = window.document.querySelector('#probeInput')
      const oldProbe = Number(probeInput.value)
      probeInput.value = String(oldProbe + 1)
      dispatchChange(window, probeInput)
      const afterMovement = JSON.parse(window.localStorage.getItem(key)).values
      assert.equal(afterMovement.a, structuralBefore.a, `Mișcarea nu deplasează cererea ${number}/${module.id}`)
      assert.equal(afterMovement.b, structuralBefore.b, `Mișcarea nu schimbă panta cererii ${number}/${module.id}`)
      assert.equal(afterMovement.c, structuralBefore.c, `Mișcarea nu deplasează oferta ${number}/${module.id}`)
      assert.equal(afterMovement.d, structuralBefore.d, `Mișcarea nu schimbă panta ofertei ${number}/${module.id}`)
      movementChecks += 1

      const anchorAButton = window.document.querySelector('#anchorA')
      assert.ok(anchorAButton, `Control A/B ${number}/${module.id}`)
      anchorAButton.click()
      const afterAnchor = JSON.parse(window.localStorage.getItem(key))
      assert.ok(afterAnchor.anchor, `Ancora A creată ${number}/${module.id}`)
      assert.equal(afterAnchor.anchor.y, afterAnchor.values.probe, `B devine A ${number}/${module.id}`)
      abChecks += 1

      window.document.querySelector('[data-mode="shift"]').click()
      const beforeShift = JSON.parse(window.localStorage.getItem(key)).values
      const demandHandle = window.document.querySelector('#dHandle')
      demandHandle.dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, clientX: 100 }))
      window.dispatchEvent(new window.MouseEvent('pointermove', { bubbles: true, clientX: 180 }))
      const afterShift = JSON.parse(window.localStorage.getItem(key)).values
      assert.notEqual(afterShift.a, beforeShift.a, `Deplasare T1 cerere ${number}/${module.id}`)
      assert.equal(afterShift.b, beforeShift.b, `Panta cererii rămâne fixă ${number}/${module.id}`)
      assert.equal(afterShift.d, beforeShift.d, `Panta ofertei rămâne fixă ${number}/${module.id}`)
      parallelShiftChecks += 1
    }

    const anchorButton = window.document.querySelector('#anchorT0')
    if (anchorButton) {
      anchorButton.click()
      const anchored = JSON.parse(window.localStorage.getItem(key))
      assert.equal(anchored.t0Anchored, true, `T0 ancorat ${number}/${module.id}`)
      assert.deepEqual(anchored.t0, anchored.values, `T0 pornește din T1 ${number}/${module.id}`)
      assert.ok(window.document.querySelector('#showT0'), `Control T0 ${number}/${module.id}`)
      assert.ok(window.document.querySelector('#showT1'), `Control T1 ${number}/${module.id}`)
      comparisonChecks += 1
    }

    const modified = JSON.parse(window.localStorage.getItem(key))
    modified.__resetProbe = `${number}/${module.id}`
    window.localStorage.setItem(key, JSON.stringify(modified))
    dispatchChange(window, moduleSelect)
    resetButton.click()
    assert.deepEqual(JSON.parse(window.localStorage.getItem(key)), expectedState(module), `Reset grafic ${number}/${module.id}`)
    assert.equal(JSON.parse(window.localStorage.getItem('eco_graph_theme_v1')).graphBg, '#123456', `Tema păstrată la reset grafic ${number}/${module.id}`)
    graphResets += 1
  }

  for (const module of config.modules) {
    const key = storageKey(config.lesson, module.id)
    const modified = JSON.parse(window.localStorage.getItem(key))
    modified.__lessonResetProbe = true
    window.localStorage.setItem(key, JSON.stringify(modified))
  }
  resetLessonButton.click()
  for (const module of config.modules) {
    assert.deepEqual(JSON.parse(window.localStorage.getItem(storageKey(config.lesson, module.id))), expectedState(module), `Reset lecție ${number}/${module.id}`)
  }
  assert.equal(JSON.parse(window.localStorage.getItem('eco_graph_theme_v1')).line1, '#abcdef', `Tema păstrată la reset lecție ${number}`)
  lessonResets += 1
  window.close()
}

assert.equal(renderedModules, 87)
assert.equal(exportableGraphs, 87)
assert.equal(graphResets, 87)
assert.equal(lessonResets, 19)
assert.ok(movementChecks > 0)
assert.equal(parallelShiftChecks, movementChecks)
assert.equal(abChecks, movementChecks)
assert.ok(comparisonChecks > 0)

console.log(JSON.stringify({
  ok: true,
  lessons: manifest.lessons.length,
  modulesRendered: renderedModules,
  exportableGraphs,
  modulesWithoutSvg,
  graphResets,
  lessonResets,
  movementChecks,
  parallelShiftChecks,
  abChecks,
  comparisonChecks,
  globalThemeKeptSeparate: true,
}, null, 2))
