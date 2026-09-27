// Pagina comună de intrare: trimite datele direct la serverul aplicației alese,
// apoi deschide aplicația deja autentificată. Aplicațiile și bazele de date rămân separate.
(() => {
  const APPS = {
    logica: {
      api: 'https://aletheia-logica.onrender.com',
      site: 'https://logica.amentor.ro',
      studentLogin: (d) => ['/auth/student-login', { email: d.email, name: d.name }],
      adminLogin: (d) => ['/login/admin', { password: d.password }],
      // Logica păstrează în browser obiectul complet al sesiunii.
      handoff: (session) => `/#intrare=${encodeSession(session)}`,
      demo: '/#intrare=demo',
    },
    economie: {
      api: 'https://aletheia-economie-api.onrender.com',
      site: 'https://economie.amentor.ro',
      studentLogin: (d) => ['/api/auth/student-login', { name: d.name, email: d.email }],
      adminLogin: (d) => ['/api/auth/admin-login', { password: d.password }],
      handoff: (result) => `/#/intrare/${encodeURIComponent(result.token)}`,
      demo: '/#/intrare/demo',
    },
  }
  // Test local (npx serve / python -m http.server pe localhost): aplicațiile rulează local.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    APPS.economie.api = 'http://127.0.0.1:8000'
    APPS.economie.site = 'http://localhost:4173'
    APPS.logica.site = 'http://localhost:5199'
  }
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  function encodeSession(session) {
    const bytes = new TextEncoder().encode(JSON.stringify(session))
    let binary = ''
    bytes.forEach((b) => { binary += String.fromCharCode(b) })
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  function errorText(payload, status) {
    const detail = payload && payload.detail
    if (typeof detail === 'string') return detail
    if (detail && typeof detail.message === 'string') return detail.message
    if (Array.isArray(detail)) return 'Verifică datele introduse.'
    if (status >= 500) return 'Serverul nu răspunde momentan. Încearcă din nou peste câteva momente.'
    return 'Autentificarea nu a reușit.'
  }

  // Serverele gratuite adorm după 15 minute; le trezim cât timp elevul completează formularul.
  Object.values(APPS).forEach((app) => {
    try { fetch(`${app.api}/health`, { mode: 'no-cors', cache: 'no-store' }).catch(() => {}) } catch { /* ignorat */ }
  })

  // Telefon: ecranul rămâne împărțit în două; atingi o materie și formularul ei se deschide.
  const focusSide = (appName) => {
    if (appName) document.body.dataset.focus = appName
    else delete document.body.dataset.focus
  }
  document.querySelectorAll('.side').forEach((side) => {
    const card = side.querySelector('.card')
    if (!card) return
    side.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', () => {
      card.querySelector(`[role=tab][data-tab="${button.dataset.open}"]`)?.click()
      focusSide(card.dataset.app)
      setTimeout(() => card.querySelector('form:not([hidden]) input')?.focus(), 350)
    }))
    card.querySelector('.back')?.addEventListener('click', () => focusSide(null))
    side.addEventListener('click', (event) => {
      const focused = document.body.dataset.focus
      if (focused && focused !== card.dataset.app && !event.target.closest('a')) focusSide(card.dataset.app)
    })
  })

  document.querySelectorAll('.card').forEach((card) => {
    const app = APPS[card.dataset.app]
    const msg = card.querySelector('.msg')
    const show = (text, info = false) => { msg.textContent = text; msg.classList.toggle('info', info); msg.hidden = !text }

    card.querySelectorAll('[role=tab]').forEach((tab) => tab.addEventListener('click', () => {
      card.querySelectorAll('[role=tab]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)))
      card.querySelectorAll('form[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab })
      show('')
    }))

    card.querySelectorAll('form[data-panel]').forEach((form) => form.addEventListener('submit', async (event) => {
      event.preventDefault()
      const kind = form.dataset.panel
      if (kind === 'demo') { window.location.assign(app.site + app.demo); return }

      const data = Object.fromEntries(new FormData(form).entries())
      if (kind === 'elev') {
        data.name = String(data.name || '').trim().replace(/\s+/g, ' ')
        data.email = String(data.email || '').trim().toLowerCase()
        if (data.name.length < 3) return show('Introdu numele complet.')
        if (!emailPattern.test(data.email)) return show('Introdu o adresă de e-mail validă.')
      } else if (!data.password) {
        return show('Introdu parola de administrator.')
      }

      const button = form.querySelector('.submit')
      const label = button.querySelector('.t')
      const original = label.textContent
      button.disabled = true
      label.textContent = 'Se verifică…'
      show('')
      const slow = setTimeout(() => show('Serverul pornește (poate dura până la un minut la prima intrare)…', true), 4000)
      try {
        const [path, body] = kind === 'elev' ? app.studentLogin(data) : app.adminLogin(data)
        const response = await fetch(app.api + path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(errorText(payload, response.status))
        clearTimeout(slow)
        label.textContent = 'Se deschide…'
        window.location.assign(app.site + app.handoff(payload))
      } catch (error) {
        clearTimeout(slow)
        show(error instanceof TypeError ? 'Nu există conexiune cu serverul. Verifică internetul și reîncearcă.' : error.message)
        button.disabled = false
        label.textContent = original
      }
    }))
  })
})()
