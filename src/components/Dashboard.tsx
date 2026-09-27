import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheckBig,
  ClipboardCheck,
  Clock3,
  Flame,
  GalleryHorizontalEnd,
  Gamepad2,
  GraduationCap,
  LibraryBig,
  Play,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { categoryInfo, chapters } from '../data/catalog'
import type { SessionApi } from '../session'

interface DashboardProps {
  sessionApi: SessionApi
  onNavigate: (path: string) => void
}

interface PlannerTask {
  id: string
  title: string
  description: string
  duration: number
  path: string
  icon: LucideIcon
  tone: 'blue' | 'violet' | 'teal' | 'green' | 'gold' | 'coral'
}

const demoSelections = [
  { title: 'Capitolul 1', copy: 'Introducere în economie · teorie, antrenament și test final', path: '#/capitol/1', icon: BookOpen, tone: 'blue' },
  { title: 'Capitolul 2', copy: 'Economia de piață și proprietatea · parcurs complet', path: '#/capitol/2', icon: BookOpen, tone: 'teal' },
  { title: 'Joc economic', copy: 'Market Maker · primul laborator de decizii', path: '#/jocuri/01_market_maker', icon: Gamepad2, tone: 'green' },
  { title: 'Grafice interactive', copy: 'Laboratorul vizual pentru lecțiile 1–2', path: '#/grafice/1', icon: ChartNoAxesCombined, tone: 'gold' },
  { title: 'Flashcarduri', copy: 'Nivel Ușor · setul 01 cu 30 de întrebări', path: '#/flashcarduri?dificultate=usor&set=1', icon: GalleryHorizontalEnd, tone: 'violet' },
  { title: 'Test de admitere', copy: '23 iulie 2025 · varianta G1', path: '#/teste-admitere/g1-23iulie2025', icon: GraduationCap, tone: 'coral' },
] as const

function DemoDashboard({ onNavigate }: Pick<DashboardProps, 'onNavigate'>) {
  return (
    <div className="dashboard demo-dashboard page-enter">
      <section className="demo-home-hero">
        <div>
          <span className="page-kicker"><Sparkles size={14}/> Bun venit în modul Demo</span>
          <h1>Explorează economia fără cont</h1>
          <p>Ai acces la o selecție complet funcțională. Rezultatele nu se salvează și dispar când închizi fila.</p>
          <div className="demo-home-actions">
            <button className="button button-primary" onClick={() => onNavigate('#/capitol/1')}><Play size={16} fill="currentColor"/> Începe Capitolul 1</button>
            <button className="button button-ghost" onClick={() => onNavigate('#/capitol/1/test-final')}><ClipboardCheck size={16}/> Deschide testul demo</button>
          </div>
        </div>
        <div className="demo-home-mark" aria-hidden="true"><span>DEMO</span><b>2</b><small>capitole deschise</small></div>
      </section>

      <section className="demo-home-selection" aria-labelledby="demo-selection-title">
        <header><span className="page-kicker">Selecție demonstrativă</span><h2 id="demo-selection-title">Încearcă experiențele esențiale</h2></header>
        <div className="demo-home-grid">
          {demoSelections.map((item) => {
            const Icon = item.icon
            return (
              <button key={item.title} className={`demo-home-card ${item.tone}`} onClick={() => onNavigate(item.path)}>
                <span><Icon size={20}/></span>
                <div><b>{item.title}</b><small>{item.copy}</small></div>
                <ArrowRight size={17}/>
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}

const dayMilliseconds = 86_400_000

function startOfWeek(date: Date) {
  const result = new Date(date)
  const day = result.getDay() || 7
  result.setDate(result.getDate() - day + 1)
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(date: Date, amount: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function dateKey(date: Date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function getPlannerTasks(dayIndex: number, chapterNumber: number): PlannerTask[] {
  const chapterPath = `#/capitol/${chapterNumber}`
  const plans: PlannerTask[][] = [
    [
      { id: 'lesson', title: `Descoperă capitolul ${chapterNumber}`, description: 'Parcurge ideile principale și exemplele vizuale.', duration: 25, path: chapterPath, icon: BookOpen, tone: 'blue' },
      { id: 'map', title: 'Privește traseul complet', description: 'Vezi legătura dintre capitolul de azi și restul materiei.', duration: 5, path: '#/harta', icon: Target, tone: 'teal' },
    ],
    [
      { id: 'flashcards', title: 'Sprint de flashcarduri', description: 'Alege un set și încearcă să obții o serie fără greșeală.', duration: 15, path: '#/flashcarduri', icon: GalleryHorizontalEnd, tone: 'violet' },
      { id: 'library', title: 'Consultă materialele', description: 'Recitește formulele și explicațiile care ți-au dat de lucru.', duration: 10, path: '#/biblioteca', icon: LibraryBig, tone: 'blue' },
    ],
    [
      { id: 'graphs', title: 'Experimentează pe grafice', description: 'Schimbă valorile și observă imediat efectele economice.', duration: 20, path: `#/grafice/${chapterNumber}`, icon: ChartNoAxesCombined, tone: 'teal' },
      { id: 'lesson-review', title: 'Fixează explicația', description: 'Revino la lecție și explică singur relația observată.', duration: 10, path: chapterPath, icon: BookOpen, tone: 'blue' },
    ],
    [
      { id: 'game', title: 'Acceptă o provocare', description: 'Aplică teoria într-un joc economic cu decizii și scor.', duration: 20, path: '#/jocuri', icon: Gamepad2, tone: 'green' },
      { id: 'flashcards-bonus', title: 'Bonus: 10 răspunsuri rapide', description: 'Încheie ziua cu o rundă scurtă de recapitulare.', duration: 8, path: '#/flashcarduri', icon: Zap, tone: 'violet' },
    ],
    [
      { id: 'recap', title: `Testul capitolului ${chapterNumber}`, description: 'Verifică ce ai înțeles și citește explicațiile răspunsurilor.', duration: 25, path: '#/teste-recapitulative', icon: ClipboardCheck, tone: 'gold' },
      { id: 'corrections', title: 'Repară o greșeală', description: 'Alege un concept neclar și mai parcurge o dată explicația.', duration: 10, path: chapterPath, icon: Target, tone: 'coral' },
    ],
    [
      { id: 'admission', title: 'Provocare de admitere', description: 'Rezolvă câteva întrebări dintr-un subiect real.', duration: 30, path: '#/teste-admitere', icon: ClipboardCheck, tone: 'coral' },
      { id: 'game-weekend', title: 'Joacă pentru consolidare', description: 'Alege simularea care ți se pare cea mai interesantă.', duration: 15, path: '#/jocuri', icon: Gamepad2, tone: 'green' },
    ],
    [
      { id: 'weekly-review', title: 'Recapitularea săptămânii', description: 'Privește progresul și bifează capitolul dacă l-ai înțeles.', duration: 15, path: '#/harta', icon: Target, tone: 'teal' },
      { id: 'next-preview', title: 'Pregătește pasul următor', description: 'Răsfoiește următorul capitol fără presiunea unui test.', duration: 10, path: `#/capitol/${Math.min(chapters.length, chapterNumber + 1)}`, icon: BookOpen, tone: 'blue' },
    ],
  ]
  return plans[dayIndex] ?? plans[0]
}

function MarketSketch() {
  return (
    <div className="home-market-sketch" aria-hidden="true">
      <div className="home-sketch-heading"><span>Exemplu vizual</span><b>Piața și echilibrul</b></div>
      <svg viewBox="0 0 460 260" role="presentation">
        <defs>
          <linearGradient id="home-demand-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#55b5bd" stopOpacity=".24" />
            <stop offset="100%" stopColor="#55b5bd" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="home-axis" d="M55 25V220H420" />
        <path className="home-grid-line" d="M55 72H420M55 121H420M55 170H420M145 25V220M235 25V220M325 25V220" />
        <path className="home-demand-area" d="M72 55C155 77 278 148 402 205V220H72Z" />
        <path className="home-demand" d="M72 55C155 77 278 148 402 205" />
        <path className="home-supply" d="M72 202C164 171 260 112 402 47" />
        <path className="home-guide" d="M235 220V127H55" />
        <circle className="home-equilibrium" cx="235" cy="127" r="7" />
        <text x="365" y="194">CERERE</text>
        <text x="354" y="61">OFERTĂ</text>
        <text className="home-e-label" x="248" y="116">E</text>
        <text className="home-axis-label" x="21" y="35">P</text>
        <text className="home-axis-label" x="410" y="246">Q</text>
      </svg>
      <div className="home-sketch-note"><span>E</span><p>Punctul în care cererea și oferta se întâlnesc.</p></div>
    </div>
  )
}

export function Dashboard(props: DashboardProps) {
  if (props.sessionApi.session.isDemo) return <DemoDashboard onNavigate={props.onNavigate} />
  return <StandardDashboard {...props} />
}

function StandardDashboard({ sessionApi, onNavigate }: DashboardProps) {
  const { session } = sessionApi
  const activeChapter = chapters.find((chapter) => chapter.number === session.lastChapter) ?? chapters[0]
  const firstName = session.userName.trim().split(/\s+/)[0] || 'exploratorule'
  const completedChapterCount = session.completedChapters.length
  const courseProgress = Math.round((completedChapterCount / chapters.length) * 100)
  const today = useMemo(() => {
    const value = new Date()
    value.setHours(0, 0, 0, 0)
    return value
  }, [])
  const currentWeekStart = useMemo(() => startOfWeek(today), [today])
  const [weekStart, setWeekStart] = useState(currentWeekStart)
  const [selectedDate, setSelectedDate] = useState(today)
  const selectedDayRef = useRef<HTMLButtonElement>(null)
  const plannerStorageKey = `economia-home-planner-v1:${session.userEmail || session.userName || 'local'}`
  const [completedPlanTasks, setCompletedPlanTasks] = useState<string[]>(() => {
    try {
      const value = JSON.parse(window.localStorage.getItem(plannerStorageKey) ?? '[]')
      return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
    } catch {
      return []
    }
  })
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart])
  const selectedDayIndex = Math.max(0, Math.min(6, Math.round((selectedDate.getTime() - weekStart.getTime()) / dayMilliseconds)))
  const weekOffset = Math.round((weekStart.getTime() - currentWeekStart.getTime()) / (7 * dayMilliseconds))
  const suggestedChapter = Math.max(1, Math.min(chapters.length, activeChapter.number + weekOffset))
  const selectedTasks = getPlannerTasks(selectedDayIndex, suggestedChapter)
  const selectedPrefix = `${dateKey(selectedDate)}:`
  const selectedCompleted = selectedTasks.filter((task) => completedPlanTasks.includes(`${selectedPrefix}${task.id}`)).length
  const weekTaskKeys = weekDays.flatMap((day, index) => getPlannerTasks(index, suggestedChapter).map((task) => `${dateKey(day)}:${task.id}`))
  const weekCompleted = weekTaskKeys.filter((key) => completedPlanTasks.includes(key)).length
  const activeDays = weekDays.filter((day, index) => getPlannerTasks(index, suggestedChapter).some((task) => completedPlanTasks.includes(`${dateKey(day)}:${task.id}`))).length
  const isCurrentWeek = dateKey(weekStart) === dateKey(currentWeekStart)

  useEffect(() => {
    if (window.matchMedia?.('(max-width: 680px)').matches) {
      // Centrează ziua doar pe orizontală, fără să derulăm toată pagina (pe telefon ajungeai direct la planificator).
      const day = selectedDayRef.current
      let strip = day?.parentElement ?? null
      while (strip && strip.scrollWidth <= strip.clientWidth) strip = strip.parentElement
      if (day && strip && strip !== document.body && strip !== document.documentElement) {
        const dayBox = day.getBoundingClientRect()
        const stripBox = strip.getBoundingClientRect()
        strip.scrollLeft += dayBox.left - stripBox.left - (stripBox.width - dayBox.width) / 2
      }
    }
  }, [selectedDate, weekStart])

  const moveWeek = (amount: number) => {
    const nextWeek = addDays(weekStart, amount * 7)
    setWeekStart(nextWeek)
    setSelectedDate(nextWeek)
  }

  const returnToToday = () => {
    setWeekStart(currentWeekStart)
    setSelectedDate(today)
  }

  const togglePlanTask = (taskId: string) => {
    const key = `${selectedPrefix}${taskId}`
    setCompletedPlanTasks((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
      window.localStorage.setItem(plannerStorageKey, JSON.stringify(next))
      return next
    })
  }

  return (
    <div className="dashboard home-dashboard page-enter">
      <header className="home-topline">
        <div className="home-welcome-copy">
          <span className="page-kicker">Spațiul tău de studiu</span>
          <h1>Bun venit, {firstName}.</h1>
          <p>Ai tot cursul într-un singur loc. Continuăm exact de unde ai rămas.</p>
        </div>
        <div className="home-course-progress" style={{ '--home-progress': `${courseProgress * 3.6}deg` } as React.CSSProperties}>
          <div className="home-progress-ring"><span><b>{courseProgress}%</b><small>parcurs</small></span></div>
          <div><small>Progresul cursului</small><b>{completedChapterCount} din {chapters.length} capitole</b><span>{completedChapterCount === 0 ? 'Primul capitol te așteaptă' : 'Continuă în ritmul tău'}</span></div>
        </div>
      </header>

      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-hero-label"><Sparkles size={14}/> Economia, explicată vizual</span>
          <h2>Înțelege conceptele. <em>Apoi pune-le la lucru.</em></h2>
          <p>Învață în ordine, verifică relațiile pe grafice, exersează prin jocuri și testează-te pe întrebări reale.</p>
          <div className="home-hero-actions">
            <button className="button button-light" onClick={() => document.getElementById('home-chapter-shelf')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><Play size={16} fill="currentColor"/> Alege capitolul</button>
            <button className="home-secondary-action" onClick={() => onNavigate('#/jocuri')}><Gamepad2 size={16}/> Intră în jocuri <ArrowRight size={16}/></button>
          </div>
          <div className="home-hero-facts">
            <span><b>{completedChapterCount}</b> capitole parcurse</span>
            <span><b>{session.completedActivities.length}</b> activități bifate</span>
            <span><b>{session.completedRecapTests.length}</b> teste finalizate</span>
          </div>
        </div>
        <MarketSketch />
      </section>

      <section className="home-section home-chapters-section" id="home-chapter-shelf">
        <div className="home-section-heading">
          <div><span className="page-kicker">Raftul cursului</span><h2>Alege capitolul</h2><p>Toată materia, în ordine. Apasă direct pe capitolul de care ai nevoie.</p></div>
          <span className="home-chapters-count">{completedChapterCount}/{chapters.length} parcurse</span>
        </div>
        <div className="home-chapter-shelf">
          {chapters.map((chapter) => {
            const completed = session.completedChapters.includes(chapter.number)
            const category = categoryInfo[chapter.category]
            return (
              <button
                key={chapter.number}
                className={`${completed ? 'is-complete' : ''} ${chapter.number === session.lastChapter ? 'is-recent' : ''}`}
                style={{ '--home-category': category.color } as React.CSSProperties}
                onClick={() => onNavigate(`#/capitol/${chapter.number}`)}
                aria-label={`Deschide capitolul ${chapter.number}: ${chapter.title}`}
              >
                <span className="home-chapter-book-number">{String(chapter.number).padStart(2, '0')}</span>
                <span className="home-chapter-book-copy">
                  <small>{category.label}</small>
                  <b>{chapter.title}</b>
                  <i><Clock3 size={11}/> {chapter.duration} min</i>
                </span>
                <span className="home-chapter-book-status">{completed ? <CircleCheckBig size={17}/> : <ArrowRight size={15}/>}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="home-section home-planner-section">
        <div className="home-planner-heading">
          <div>
            <span className="page-kicker"><CalendarDays size={14}/> Plan interactiv</span>
            <h2>Săptămâna ta de studiu</h2>
            <p>Alege o zi, pornește misiunea și bifeaz-o când ai terminat.</p>
          </div>
          <div className="home-planner-stats">
            <span><Target size={16}/><b>{weekCompleted}/{weekTaskKeys.length}</b><small>misiuni</small></span>
            <span><Flame size={16}/><b>{activeDays}</b><small>zile active</small></span>
            <span><Zap size={16}/><b>{weekCompleted * 10}</b><small>puncte</small></span>
          </div>
        </div>

        <div className="home-planner">
          <header className="home-planner-nav">
            <button onClick={() => moveWeek(-1)} aria-label="Săptămâna anterioară"><ChevronLeft size={18}/></button>
            <div>
              <small>{isCurrentWeek ? 'SĂPTĂMÂNA CURENTĂ' : 'PLANIFICARE'}</small>
              <b>{weekDays[0].toLocaleDateString('ro-RO', { day: 'numeric', month: 'long' })} — {weekDays[6].toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}</b>
            </div>
            {!isCurrentWeek && <button className="home-today-button" onClick={returnToToday}>Astăzi</button>}
            <button onClick={() => moveWeek(1)} aria-label="Săptămâna următoare"><ChevronRight size={18}/></button>
          </header>

          <div className="home-calendar-days" role="tablist" aria-label="Zilele săptămânii">
            {weekDays.map((day, index) => {
              const dayTasks = getPlannerTasks(index, suggestedChapter)
              const dayCompleted = dayTasks.filter((task) => completedPlanTasks.includes(`${dateKey(day)}:${task.id}`)).length
              const selected = dateKey(day) === dateKey(selectedDate)
              const isToday = dateKey(day) === dateKey(today)
              return (
                <button
                  key={dateKey(day)}
                  ref={selected ? selectedDayRef : undefined}
                  className={`${selected ? 'is-selected' : ''} ${dayCompleted === dayTasks.length ? 'is-complete' : ''}`}
                  onClick={() => setSelectedDate(day)}
                  role="tab"
                  aria-selected={selected}
                >
                  <small>{day.toLocaleDateString('ro-RO', { weekday: 'short' }).replace('.', '')}</small>
                  <b>{day.getDate()}</b>
                  <span>{dayCompleted}/{dayTasks.length}</span>
                  {isToday && <i>azi</i>}
                </button>
              )
            })}
          </div>

          <div className="home-day-plan">
            <aside>
              <span>MISIUNEA ZILEI</span>
              <h3>{selectedDate.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
              <p>{selectedCompleted === selectedTasks.length ? 'Ai terminat tot pentru această zi. Foarte bine!' : selectedCompleted === 0 ? 'Două activități scurte, alese ca să alterneze teoria cu practica.' : 'Ai început bine. Mai ai o singură misiune pentru azi.'}</p>
              <div className="home-day-score">
                <span style={{ '--day-progress': `${(selectedCompleted / selectedTasks.length) * 360}deg` } as React.CSSProperties}><b>{selectedCompleted}/{selectedTasks.length}</b></span>
                <div><small>PROGRESUL ZILEI</small><b>+{selectedCompleted * 10} puncte</b></div>
              </div>
            </aside>

            <ol className="home-timeline">
              {selectedTasks.map((task, index) => {
                const completed = completedPlanTasks.includes(`${selectedPrefix}${task.id}`)
                const Icon = task.icon
                return (
                  <li className={completed ? 'is-complete' : ''} key={task.id}>
                    <button className="home-task-check" onClick={() => togglePlanTask(task.id)} aria-label={completed ? `Debifează ${task.title}` : `Bifează ${task.title}`}>
                      {completed ? <CircleCheckBig size={22}/> : <Circle size={22}/>}<span>{String(index + 1).padStart(2, '0')}</span>
                    </button>
                    <span className={`home-task-icon ${task.tone}`}><Icon size={19}/></span>
                    <div className="home-task-copy">
                      <div><b>{task.title}</b><small><Clock3 size={12}/> {task.duration} min</small></div>
                      <p>{task.description}</p>
                    </div>
                    <button className="home-task-open" onClick={() => onNavigate(task.path)}>{completed ? 'Reia' : 'Pornește'}<ArrowRight size={15}/></button>
                  </li>
                )
              })}
            </ol>
          </div>
        </div>
      </section>

      <section className="home-section home-shortcuts-section">
        <div><span className="page-kicker">Acces rapid</span><h2>Mai vrei să explorezi?</h2></div>
        <nav aria-label="Scurtături de studiu">
          <button aria-label="Deschide lecțiile" onClick={() => onNavigate('#/lectii')}><BookOpen size={17}/> Lecții</button>
          <button aria-label="Deschide flashcardurile" onClick={() => onNavigate('#/flashcarduri')}><GalleryHorizontalEnd size={17}/> Flashcarduri</button>
          <button aria-label="Deschide jocurile" onClick={() => onNavigate('#/jocuri')}><Gamepad2 size={17}/> Jocuri</button>
          <button aria-label="Deschide testele recapitulative" onClick={() => onNavigate('#/teste-recapitulative')}><ClipboardCheck size={17}/> Teste</button>
          <button aria-label="Deschide biblioteca" onClick={() => onNavigate('#/biblioteca')}><LibraryBig size={17}/> Bibliotecă</button>
        </nav>
      </section>
    </div>
  )
}
