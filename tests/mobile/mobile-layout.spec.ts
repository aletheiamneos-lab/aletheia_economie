import { expect, test, type Page, type TestInfo } from '@playwright/test'

type LayoutAudit = {
  viewportWidth: number
  pageWidth: number
  overflowing: string[]
  smallControls: string[]
  criticalSmallControls: string[]
}

async function signIn(page: Page) {
  await page.goto('/#/')
  await expect(page.getByRole('heading', { name: 'Bun venit la studiu' })).toBeVisible()
  await page.getByPlaceholder('Ex.: Andrei Popescu').fill('Andrei Popescu')
  await page.getByPlaceholder('elev@exemplu.ro').fill('andrei@exemplu.ro')
  await page.getByRole('button', { name: /Intră în spațiul de studiu/ }).click()
  await expect(page.getByRole('heading', { name: 'Bun venit înapoi.' })).toBeVisible()
}

async function auditLayout(page: Page): Promise<LayoutAudit> {
  return page.evaluate(() => {
    const viewportWidth = window.innerWidth
    const visible = (element: Element, rectangle: DOMRect) => {
      const style = window.getComputedStyle(element)
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 && rectangle.width > 0 && rectangle.height > 0
    }
    const label = (element: Element) => {
      const name = element.getAttribute('aria-label') || element.textContent?.trim().replace(/\s+/g, ' ') || ''
      return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.classList.length ? `.${Array.from(element.classList).join('.')}` : ''}${name ? ` (${name.slice(0, 55)})` : ''}`
    }
    const insideOverflowContainer = (element: Element) => {
      let parent = element.parentElement
      while (parent && parent !== document.body) {
        const overflowX = window.getComputedStyle(parent).overflowX
        if (['auto', 'scroll', 'hidden', 'clip'].includes(overflowX)) return true
        parent = parent.parentElement
      }
      return false
    }

    const overflowing = Array.from(document.querySelectorAll('body *')).flatMap((element) => {
      const rectangle = element.getBoundingClientRect()
      if (!visible(element, rectangle)) return []
      if (element.closest('.main-sidebar:not(.is-open)')) return []
      if (element.closest('[aria-hidden="true"]')) return []
      if (insideOverflowContainer(element)) return []
      const style = window.getComputedStyle(element)
      if (style.position === 'fixed' && rectangle.right <= 1) return []
      return rectangle.right > viewportWidth + 1 || rectangle.left < -1 ? [label(element)] : []
    }).slice(0, 20)

    const smallControls = Array.from(document.querySelectorAll('button, a, input, select, textarea, [role="button"]')).flatMap((element) => {
      const rectangle = element.getBoundingClientRect()
      if (!visible(element, rectangle)) return []
      return rectangle.width < 40 || rectangle.height < 40 ? [label(element)] : []
    }).slice(0, 30)

    const criticalSelectors = [
      '.mobile-menu-button', '.sidebar-close', '.home-status-button', '.home-resource-card>button',
      '.back-button', '.notes-button', '.lesson-manual-status', '.small-button',
      '.mind-map-control-actions button', '.mind-concept-cloud button', '.mind-open-lesson',
      '.math-composer-toolbar button', '.math-preview-actions button', '.game-card>button',
      '.recap-manual-toggle', '.recap-open-button', '.admission-variant-filter button', '.admission-open-button',
    ].join(',')
    const criticalSmallControls = Array.from(document.querySelectorAll(criticalSelectors)).flatMap((element) => {
      const rectangle = element.getBoundingClientRect()
      if (!visible(element, rectangle) || element.closest('[aria-hidden="true"]') || element.closest('.main-sidebar:not(.is-open)')) return []
      return rectangle.width < 40 || rectangle.height < 40 ? [label(element)] : []
    })

    return {
      viewportWidth,
      pageWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
      overflowing,
      smallControls,
      criticalSmallControls,
    }
  })
}

async function expectMobileLayout(page: Page, routeName: string, testInfo: TestInfo) {
  const audit = await auditLayout(page)
  await testInfo.attach(`${routeName}-layout.json`, {
    body: Buffer.from(JSON.stringify(audit, null, 2)),
    contentType: 'application/json',
  })
  expect(audit.pageWidth, `${routeName}: pagina produce scroll orizontal`).toBeLessThanOrEqual(audit.viewportWidth + 1)
  expect(audit.overflowing, `${routeName}: există elemente vizibile în afara ecranului`).toEqual([])
  expect(audit.criticalSmallControls, `${routeName}: există acțiuni principale prea mici pentru atingere`).toEqual([])
}

async function openRoute(page: Page, hash: string, heading: string) {
  await page.evaluate((nextHash) => { window.location.hash = nextHash }, hash)
  await expect(page.getByRole('heading', { name: heading, level: 1 }).first()).toBeVisible()
  await expect(page.locator('.route-loading')).toHaveCount(0)
}

test('fluxurile elevului rămân utilizabile pe telefon', async ({ page }, testInfo) => {
  await page.goto('/#/')
  await expectMobileLayout(page, 'autentificare', testInfo)
  await signIn(page)
  await expectMobileLayout(page, 'panou', testInfo)
  if (testInfo.project.name === 'telefon-390') await page.screenshot({ path: testInfo.outputPath('panou.png'), fullPage: true })

  await page.getByRole('button', { name: 'Deschide meniul' }).click()
  await expect(page.locator('.main-sidebar')).toHaveClass(/is-open/)
  await expect(page.getByRole('navigation', { name: 'Navigare principală' })).toBeVisible()
  const closeButton = await page.locator('.sidebar-close').boundingBox()
  expect(closeButton?.width).toBeGreaterThanOrEqual(40)
  expect(closeButton?.height).toBeGreaterThanOrEqual(40)
  await page.locator('.sidebar-close').click()
  await expect(page.locator('.main-sidebar')).not.toHaveClass(/is-open/)

  const routes = [
    ['#/biblioteca', 'Manuale și suporturi', 'biblioteca'],
    ['#/lectii', 'Lecții', 'lectii'],
    ['#/harta', 'Harta materiei', 'harta'],
    ['#/flashcarduri', 'Flashcarduri', 'flashcarduri'],
    ['#/capitol/1', 'Introducere în economie', 'lectie'],
    ['#/capitol/1/antrenament', 'Banca de exerciții', 'exercitii'],
    ['#/capitol/1/test-final', 'Test final', 'test-final'],
    ['#/teste-recapitulative/capitol/1', 'Test recapitulativ', 'test-recapitulativ'],
    ['#/teste-admitere/g1-23iulie2025', '23 iulie 2025', 'test-admitere'],
    ['#/caiet-matematic', 'Scrie simplu, explică vizual.', 'ecuatii'],
    ['#/grafice/1', 'Grafice interactive', 'grafice'],
    ['#/jocuri', 'Economia se învață în mișcare.', 'jocuri'],
    ['#/jocuri/market_maker', 'Market Maker', 'joc-deschis'],
    ['#/teste-recapitulative', 'Teste recapitulative', 'recapitulare'],
    ['#/teste-admitere', 'Teste de admitere', 'admitere'],
    ['#/profil', 'Profilul meu', 'profil'],
  ] as const

  for (const [hash, heading, routeName] of routes) {
    await openRoute(page, hash, heading)
    await expectMobileLayout(page, routeName, testInfo)
    if (routeName === 'flashcarduri') {
      await expect(page.locator('.flashcards-deck-tile')).toHaveCount(120)
      if (testInfo.project.name === 'telefon-390') await page.screenshot({ path: testInfo.outputPath('flashcarduri-catalog.png'), fullPage: true })
      await page.getByRole('button', { name: 'Deschide Ușor, setul 01' }).click()
      await expect(page.getByRole('button', { name: 'Arată răspunsul' })).toBeVisible()
      const viewportFit = await page.evaluate(() => ({ height: window.innerHeight, pageHeight: document.documentElement.scrollHeight }))
      expect(viewportFit.pageHeight, 'studiul flashcardurilor trebuie să încapă într-un ecran').toBeLessThanOrEqual(viewportFit.height + 1)
      await page.getByRole('button', { name: 'Arată răspunsul' }).click()
      await expect(page.getByText('Varianta B')).toBeVisible()
      await page.getByRole('button', { name: 'Știu răspunsul' }).click()
      await expect(page.getByText('Cardul 2 din 30')).toBeVisible()
    }
    if (testInfo.project.name === 'telefon-390' && ['harta', 'flashcarduri', 'lectie', 'exercitii', 'ecuatii', 'grafice', 'admitere'].includes(routeName)) {
      await page.screenshot({ path: testInfo.outputPath(`${routeName}.png`), fullPage: true })
    }
  }
})

test('panoul administratorului rămâne utilizabil pe telefon', async ({ page }, testInfo) => {
  await page.goto('/#/')
  await page.getByRole('tab', { name: 'Administrator' }).click()
  await page.getByRole('button', { name: /Intră ca administrator/ }).click()
  await expect(page.getByRole('heading', { name: 'Rapoarte și activitate', level: 1 })).toBeVisible()
  await expectMobileLayout(page, 'administrare', testInfo)
})

test('flashcardurile încap într-un singur ecran desktop', async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== 'telefon-390')
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4174',
    viewport: { width: 1366, height: 768 },
  })
  const page = await context.newPage()
  await signIn(page)
  await openRoute(page, '#/flashcarduri', 'Flashcarduri')
  await expect(page.locator('.flashcards-deck-tile')).toHaveCount(120)
  const catalogFit = await page.evaluate(() => ({ width: window.innerWidth, pageWidth: document.documentElement.scrollWidth }))
  expect(catalogFit.pageWidth, 'catalogul nu trebuie să producă scroll orizontal').toBeLessThanOrEqual(catalogFit.width + 1)
  await page.screenshot({ path: testInfo.outputPath('flashcarduri-catalog-desktop.png'), fullPage: false })
  await page.getByRole('button', { name: 'Deschide Foarte greu, setul 26' }).click()
  await expect(page.getByRole('button', { name: 'Arată răspunsul' })).toBeVisible()
  await page.getByRole('button', { name: 'Arată răspunsul' }).click()
  await expect(page.getByText('Varianta B')).toBeVisible()
  const viewportFit = await page.evaluate(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    pageWidth: document.documentElement.scrollWidth,
    pageHeight: document.documentElement.scrollHeight,
    contentHeight: document.querySelector('.flashcard-content')?.clientHeight ?? 0,
    contentScrollHeight: document.querySelector('.flashcard-content')?.scrollHeight ?? 0,
  }))
  expect(viewportFit.pageWidth).toBeLessThanOrEqual(viewportFit.width + 1)
  expect(viewportFit.pageHeight).toBeLessThanOrEqual(viewportFit.height + 1)
  expect(viewportFit.contentScrollHeight, 'răspunsul lung trebuie să încapă fără scroll interior').toBeLessThanOrEqual(viewportFit.contentHeight + 1)
  await page.screenshot({ path: testInfo.outputPath('flashcarduri-desktop.png'), fullPage: true })
  await context.close()
})
