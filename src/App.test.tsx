/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import graphManifest from '../public/graph-lab/data/manifest.json'
import lessonOneIntegration from '../public/graph-lab/integration/lesson_01.integration.json'
import admissionManifest from '../public/admission-tests/manifest.json'
import admissionTest2025 from '../public/admission-tests/data/Grila_G1_23iulie2025.json'
import libraryManifest from '../public/library/manifest.json'

function renderStudentApp() {
  render(<App />)
  fireEvent.change(screen.getByRole('textbox', { name: /nume complet/i }), { target: { value: 'Andrei Popescu' } })
  fireEvent.change(screen.getByRole('textbox', { name: /adresă de e-mail/i }), { target: { value: 'andrei@exemplu.ro' } })
  fireEvent.click(screen.getByRole('button', { name: /intră în spațiul de studiu/i }))
}

function renderAdminApp() {
  render(<App />)
  fireEvent.click(screen.getByRole('tab', { name: /administrator/i }))
  fireEvent.click(screen.getByRole('button', { name: /intră ca administrator/i }))
}

describe('application flow', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.location.hash = '#/'
    window.scrollTo = vi.fn()
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('starts with separate student and administrator access', () => {
    render(<App />)
    expect(screen.getByLabelText('Economie by A mentor')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Elev' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: 'Administrator' }))
    expect(screen.getByRole('heading', { name: 'Spațiul administratorului' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /adresă de e-mail/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Parolă')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /intră ca administrator/i })).toBeInTheDocument()
  })

  it('returns to the access page after logout', () => {
    renderStudentApp()
    fireEvent.click(screen.getByRole('button', { name: 'Deconectare' }))
    expect(screen.getByRole('heading', { name: 'Bun venit la studiu' })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Navigare principală' })).not.toBeInTheDocument()
  })

  it('opens the real chapter from the dashboard', async () => {
    renderStudentApp()
    expect(screen.getByRole('heading', { name: 'Bun venit, Andrei.' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /deschide capitolul 1:/i }))
    await waitFor(
      () => expect(screen.getByRole('heading', { name: 'Introducere în economie', level: 1 })).toBeInTheDocument(),
      { timeout: 5000 },
    )
    expect(screen.getAllByText('Nevoile umane')).toHaveLength(2)
  })

  it('lists every chapter under Lessons and opens its selected activity', async () => {
    renderStudentApp()
    fireEvent.click(screen.getByRole('button', { name: 'Lecții' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Lecții', level: 1 })).toBeInTheDocument(), { timeout: 10000 })
    expect(window.location.hash).toBe('#/lectii')
    expect(document.querySelectorAll('.lesson-list-row')).toHaveLength(19)
    expect(document.querySelectorAll('.lesson-list-action .theory')).toHaveLength(19)
    expect(document.querySelectorAll('.lesson-list-action .practice')).toHaveLength(19)
    expect(document.querySelectorAll('.lesson-list-action .final')).toHaveLength(19)

    const chapterThree = Array.from(document.querySelectorAll<HTMLElement>('.lesson-list-row')).find((row) => row.textContent?.includes('Utilitatea bunurilor economice'))
    expect(chapterThree).toBeDefined()
    const practiceButton = chapterThree!.querySelector<HTMLButtonElement>('button.practice')!
    const tooltipId = practiceButton.getAttribute('aria-describedby')
    expect(tooltipId).toBe('lesson-3-practice-tip')
    expect(document.getElementById(tooltipId!)).toHaveTextContent('Întrebări cu feedback și rezolvare imediată.')
    fireEvent.click(practiceButton)
    await waitFor(() => expect(window.location.hash).toBe('#/capitol/3/antrenament'))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Banca de exerciții', level: 1 })).toBeInTheDocument(), { timeout: 10000 })
  })

  it('opens flashcards and records progress inside the fixed study screen', async () => {
    const flashcardDeck = {
      nivel: 'usor',
      slot: 1,
      numar_intrebari: 30,
      intrebari: Array.from({ length: 30 }, (_, index) => ({
        numar_in_slot: index + 1,
        enunt: `Întrebarea ${index + 1}`,
        variante: { a: 'Varianta A', b: 'Varianta corectă', c: 'Varianta C', d: 'Varianta D', e: 'Varianta E' },
        raspuns_corect: 'b',
        rezolvare: `Explicația ${index + 1}`,
      })),
    }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => flashcardDeck } as Response)))
    renderStudentApp()

    fireEvent.click(screen.getByRole('button', { name: 'Flashcarduri' }))
    expect(window.location.hash).toBe('#/flashcarduri')
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Flashcarduri', level: 1 })).toBeInTheDocument(), { timeout: 15000 })
    expect(document.querySelectorAll('.flashcards-deck-tile')).toHaveLength(120)
    fireEvent.click(screen.getByRole('button', { name: 'Deschide Ușor, setul 01' }))
    await waitFor(() => expect(screen.getByText('Întrebarea 1')).toBeInTheDocument())
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')

    fireEvent.click(screen.getByRole('button', { name: 'Arată răspunsul' }))
    expect(screen.getByText('Varianta corectă')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Știu răspunsul' }))

    expect(screen.getByText('Cardul 2 din 30')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3')
  })

  it('opens the PDF library and supports preview, download and visibility controls', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => libraryManifest } as Response)))
    renderStudentApp()

    expect(screen.getByText('Economie')).toBeInTheDocument()
    expect(screen.getByText('by A mentor')).toBeInTheDocument()
    expect(screen.getByText('E', { selector: '.brand-folder b' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Biblioteca' }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Manuale și suporturi', level: 1 })).toBeInTheDocument())
    expect(window.location.hash).toBe('#/biblioteca')
    await waitFor(() => expect(document.querySelectorAll('.library-resource')).toHaveLength(26))
    expect(screen.getAllByRole('link', { name: /descarcă/i })).toHaveLength(26)

    expect(screen.queryByRole('button', { name: 'Ascunde elevilor' })).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: 'Preview' })[0])
    expect(screen.getByRole('dialog', { name: 'Introducere în economie' })).toBeInTheDocument()
    expect(screen.getByTitle('Previzualizare Introducere în economie')).toHaveAttribute('src', '/library/capitol-01.pdf#view=FitH')
    fireEvent.click(screen.getByRole('button', { name: 'Închide previzualizarea' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps personal notes only in the current session', async () => {
    renderStudentApp()
    fireEvent.click(screen.getByRole('button', { name: /deschide capitolul 1:/i }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Introducere în economie', level: 1 })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Notițe' }))
    const textarea = screen.getByRole('textbox', { name: '' })
    fireEvent.change(textarea, { target: { value: 'Costul de oportunitate — de revăzut.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Păstrează în sesiune' }))
    fireEvent.click(screen.getByRole('button', { name: 'Notițe' }))
    expect(screen.getByRole('textbox', { name: '' })).toHaveValue('Costul de oportunitate — de revăzut.')
    expect(window.localStorage.getItem('economia-app-progress-v1')).toBeNull()
  })

  it('opens a later chapter and its own final test', async () => {
    window.location.hash = '#/capitol/19'
    renderStudentApp()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Piața mondială', level: 1 })).toBeInTheDocument())
    fireEvent.click(screen.getAllByRole('button', { name: /test final/i })[0])
    await waitFor(() => expect(window.location.hash).toBe('#/capitol/19/test-final'))
    expect(screen.getAllByText(/Capitolul 19/).length).toBeGreaterThan(0)
  })

  it('lists the 19 recap tests with chapter titles and opens the selected test', async () => {
    window.location.hash = '#/teste-recapitulative'
    renderStudentApp()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Teste recapitulative', level: 1 })).toBeInTheDocument())
    expect(document.querySelectorAll('.recap-test-card')).toHaveLength(19)
    expect(screen.getAllByText('Piața mondială').length).toBeGreaterThan(0)
    const card = Array.from(document.querySelectorAll('.recap-test-card')).find((item) => item.textContent?.includes('Capitolul 19') && item.textContent?.includes('Piața mondială'))
    expect(card).toBeDefined()
    fireEvent.click(card!.querySelector('.recap-open-button')!)
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Test recapitulativ', level: 1 })).toBeInTheDocument())
    expect(screen.getAllByText(/Piața mondială/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('40', { selector: 'b' }).length).toBeGreaterThan(0)
  })

  it('opens the admission archive from the sidebar and loads a complete test', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const payload = url.endsWith('/manifest.json') ? admissionManifest : admissionTest2025
      return { ok: true, json: async () => payload } as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    renderStudentApp()
    fireEvent.click(screen.getByRole('button', { name: /teste de admitere/i }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Teste de admitere', level: 1 })).toBeInTheDocument())
    expect(window.location.hash).toBe('#/teste-admitere')
    await waitFor(() => expect(document.querySelectorAll('.admission-test-card')).toHaveLength(36))
    expect(screen.getByText('1.280')).toBeInTheDocument()

    fireEvent.click(document.querySelector('.admission-open-button')!)
    await waitFor(() => expect(screen.getByRole('heading', { name: '23 iulie 2025', level: 1 })).toBeInTheDocument())
    expect(screen.getByText(/test real de admitere la economie/i)).toBeInTheDocument()
    expect(screen.getByText('Subiecte_Grila_123_07_2025.pdf')).toBeInTheDocument()
    expect(screen.getAllByText('30', { selector: 'b' }).length).toBeGreaterThan(0)
  })

  it('opens the administrator profile only through administrator access', async () => {
    window.location.hash = '#/profil'
    renderAdminApp()
    expect(await screen.findByRole('heading', { name: 'Panou administrativ', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Activitatea elevilor')).toBeInTheDocument()
    expect(screen.getByText('admin@exemplu.ro')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Personalizează experiența aplicației' })).toBeInTheDocument()
    expect(document.querySelectorAll('.theme-option')).toHaveLength(6)
    expect(document.querySelectorAll('.font-option')).toHaveLength(7)
  })

  it('persists the administrator theme, font and changed password', async () => {
    renderAdminApp()
    fireEvent.click(screen.getByTitle('Deschide profilul'))
    await screen.findByRole('heading', { name: 'Panou administrativ', level: 1 })

    fireEvent.click(screen.getByRole('button', { name: /Forest \/ Ink Executive/i }))
    fireEvent.click(screen.getByRole('button', { name: /Lora \/ Karla/i }))
    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('forest')
      expect(document.documentElement.dataset.font).toBe('lora')
    })
    expect(JSON.parse(window.localStorage.getItem('economia-appearance-v1') ?? '{}')).toEqual({ theme: 'forest', font: 'lora' })

    const passwordFields = document.querySelectorAll<HTMLInputElement>('.password-settings input')
    expect(passwordFields).toHaveLength(3)
    fireEvent.change(passwordFields[0], { target: { value: 'admin123' } })
    fireEvent.change(passwordFields[1], { target: { value: 'NouaParola9' } })
    fireEvent.change(passwordFields[2], { target: { value: 'NouaParola9' } })
    fireEvent.click(screen.getByRole('button', { name: /salvează parola/i }))
    expect(screen.getByRole('status')).toHaveTextContent(/a fost actualizată/i)

    fireEvent.click(screen.getByRole('button', { name: 'Deconectare' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Administrator' }))
    fireEvent.click(screen.getByRole('button', { name: /intră ca administrator/i }))
    expect(await screen.findByRole('heading', { name: 'Rapoarte și activitate', level: 1 })).toBeInTheDocument()
  })

  it('shows the student progress and study shortcuts in the student profile', () => {
    window.location.hash = '#/profil'
    renderStudentApp()
    expect(screen.getByRole('heading', { name: 'Profilul meu', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('capitole finalizate')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /deschide jocurile/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vezi harta/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Studiul tău este pregătit' })).toBeInTheDocument()
  })

  it('allows a new student to enter with any valid email address', async () => {
    render(<App />)
    fireEvent.change(screen.getByRole('textbox', { name: /nume complet/i }), { target: { value: 'Elev Necunoscut' } })
    fireEvent.change(screen.getByRole('textbox', { name: /adresă de e-mail/i }), { target: { value: 'necunoscut@exemplu.ro' } })
    fireEvent.click(screen.getByRole('button', { name: /intră în spațiul de studiu/i }))
    expect(await screen.findByRole('heading', { name: /bun venit/i })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /navigare principală/i })).toBeInTheDocument()
  })

  it('opens the admin reporting workspace and manages approved students', async () => {
    renderAdminApp()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Rapoarte și activitate', level: 1 })).toBeInTheDocument())
    expect(window.location.hash).toBe('#/admin/rapoarte')
    expect(screen.getByRole('heading', { name: 'Activitatea elevilor' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Rapoarte teste' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Elevi autorizați' })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('textbox', { name: 'Nume elev' }), { target: { value: 'Ioana Marinescu' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Adresă de e-mail' }), { target: { value: 'ioana@exemplu.ro' } })
    fireEvent.click(screen.getByRole('button', { name: /adaugă elev/i }))
    expect(screen.getByText('Ioana Marinescu')).toBeInTheDocument()
    expect(screen.getByText('ioana@exemplu.ro')).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole('button', { name: /preview test final/i })[0])
    expect(screen.getByRole('dialog', { name: /test final/i })).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Închide' })[1])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows library visibility controls only to the administrator', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => libraryManifest } as Response)))
    renderAdminApp()
    fireEvent.click(screen.getByRole('button', { name: 'Biblioteca' }))
    await waitFor(() => expect(document.querySelectorAll('.library-resource')).toHaveLength(26))
    expect(screen.getAllByRole('button', { name: 'Ascunde elevilor' })).toHaveLength(26)
  })

  it('uses manual progress inside the interactive concept map', async () => {
    renderStudentApp()
    fireEvent.click(screen.getByRole('button', { name: /deschide capitolul 1:/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Marchează parcurs' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Marchează parcurs' }))
    expect(screen.getByRole('button', { name: 'Parcurs' })).toBeInTheDocument()
    expect(window.localStorage.getItem('economia-app-progress-v1')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Harta materiei' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Harta materiei', level: 1 })).toBeInTheDocument())
    expect(screen.queryByText('Toate cele 19 capitole sunt disponibile.')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('1/2 parcurse')).toBeInTheDocument())
    expect(screen.getByText('Concepte esențiale')).toBeInTheDocument()
    expect(screen.getByText('Formule de reținut')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Caută în harta materiei' })).toBeInTheDocument()
  })

  it('opens the V5.4 graph laboratory from the sidebar and loads its integration contract', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      const payload = url.endsWith('/data/manifest.json') ? graphManifest : lessonOneIntegration
      return { ok: true, json: async () => payload } as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    renderStudentApp()
    fireEvent.click(screen.getByRole('button', { name: /grafice interactive/i }))

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Grafice interactive', level: 1 })).toBeInTheDocument())
    expect(window.location.hash).toBe('#/grafice/1')
    expect(screen.queryByText('Laborator vizual V5.4')).not.toBeInTheDocument()
    expect(screen.queryByText(/Explorează relațiile economice/)).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Control profesor' })).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Culori grafice' })).toBeEnabled())
    const lessonSelect = screen.getByRole('combobox', { name: 'Lecție' })
    expect(lessonSelect.querySelectorAll('option')).toHaveLength(19)
    expect(screen.getByText('2 grafice')).toBeInTheDocument()

    const frame = await screen.findByTitle('Grafice interactive — Capitolul 1: Introducere în economie')
    const source = frame.getAttribute('srcdoc') ?? ''
    expect(source).toContain('window.LESSON_CONFIG=')
    expect(source).toContain('cost_oportunitate')
    expect(source).toContain('/graph-lab/assets/graph-engine.js')
    expect(source).toContain('/graph-lab/assets/graph-lab.css')
    expect(source).toContain('C · vizualizare didactică')
    expect(source).toContain('.topbar{position:static!important')
    expect(source).toContain("type:'economia:graph-height'")
    expect(source).toContain('#themeBtn,#adminBtn{display:none!important}')
    expect(source).not.toContain('lessonPickerBtn')
    expect(source).toContain('dataLabelsBtn')
    expect(source).toContain("modebar.classList.toggle('is-empty'")
    expect(source).toContain("comparebar.classList.toggle('is-empty'")
    expect(source).not.toContain('pngExportBtn')
    expect(source).not.toContain('pdfExportBtn')
    expect(fetchMock).toHaveBeenCalledWith('/graph-lab/data/manifest.json', expect.any(Object))
    expect(fetchMock).toHaveBeenCalledWith('/graph-lab/integration/lesson_01.integration.json', expect.any(Object))
  })

  it('shows graph visibility controls only to the administrator', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const payload = String(input).endsWith('/data/manifest.json') ? graphManifest : lessonOneIntegration
      return { ok: true, json: async () => payload } as Response
    })
    vi.stubGlobal('fetch', fetchMock)

    window.location.hash = '#/profil'
    renderAdminApp()
    fireEvent.click(screen.getByRole('button', { name: /grafice interactive/i }))

    const openControls = await screen.findByRole('button', { name: 'Control profesor' })
    expect(screen.queryByRole('region', { name: 'Control profesor' })).not.toBeInTheDocument()
    fireEvent.click(openControls)
    const controls = screen.getByRole('region', { name: 'Control profesor' })
    expect(controls).toBeInTheDocument()
    const explanations = screen.getByRole('button', { name: /Explicații pentru elevi.*Vizibile/i })
    const formulas = screen.getByRole('button', { name: /Formule și ecuații.*Vizibile/i })
    expect(explanations).toHaveAttribute('aria-pressed', 'true')
    expect(formulas).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(explanations)
    expect(screen.getByRole('button', { name: /Explicații pentru elevi.*Blocate/i })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(formulas)
    expect(screen.getByRole('button', { name: /Formule și ecuații.*Blocate/i })).toHaveAttribute('aria-pressed', 'false')
    expect(JSON.parse(window.localStorage.getItem('eco_graph_admin_v1') ?? '{}')).toEqual({
      showExplanations: false,
      showFormulas: false,
    })

    const frame = screen.getByTitle('Grafice interactive — Capitolul 1: Introducere în economie')
    const source = frame.getAttribute('srcdoc') ?? ''
    expect(source).toContain('pngExportBtn')
    expect(source).toContain('pdfExportBtn')
    expect(source).toContain('formulas-hidden')
  })
})
