import { buildImagePdf } from './graphExport'
import type { NormalizedQuestion } from './types'
import { sessionHeaders } from './api'

export interface AdmissionReportTest {
  kind?: 'admission' | 'chapter' | 'recap'
  year: number
  session: string
  variant: string
  economyRange: string
  chapterNumber?: number
  chapterTitle?: string
}

export interface AdmissionReportData {
  studentName: string
  studentEmail?: string
  elapsedSeconds: number
  test: AdmissionReportTest
  questions: NormalizedQuestion[]
  answers: Record<string, string>
  generatedAt?: Date
}

export interface AdmissionEmailResult {
  status: 'sent'
  messageId: string
  recipient: string
  filename: string
}

const PAGE_WIDTH = 1240
const PAGE_HEIGHT = Math.round(PAGE_WIDTH * 297 / 210)
const MARGIN = 62
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const DETAIL_TOP = 154
const DETAIL_BOTTOM = PAGE_HEIGHT - 78

const COLORS = {
  navy: '#15384f',
  navySoft: '#f0f5f7',
  ink: '#172d3b',
  muted: '#657681',
  quiet: '#929fa7',
  line: '#e2e8eb',
  lineStrong: '#ced9de',
  surface: '#f7f9fa',
  green: '#287862',
  greenSoft: '#edf7f2',
  red: '#b95d58',
  redSoft: '#fff2f0',
  coral: '#df7561',
  teal: '#337f86',
  tealSoft: '#edf6f6',
  gold: '#967126',
  goldSoft: '#fff8e8',
}

type Page = { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D }

function clean(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function safeFilename(value: string) {
  return value.normalize('NFC').toLocaleLowerCase('ro-RO').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 70) || 'elev'
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const rest = safeSeconds % 60
  return hours
    ? `${hours} h ${String(minutes).padStart(2, '0')} min ${String(rest).padStart(2, '0')} s`
    : `${minutes} min ${String(rest).padStart(2, '0')} s`
}

function isChapterReport(data: AdmissionReportData) {
  return data.test.kind === 'chapter' || data.test.kind === 'recap'
}

function reportIdentity(data: AdmissionReportData) {
  if (isChapterReport(data)) {
    const chapter = data.test.chapterNumber ?? data.test.year
    const recap = data.test.kind === 'recap'
    return {
      eyebrow: recap ? 'TEST RECAPITULATIV' : 'EVALUARE PE CAPITOL',
      title: recap ? 'Raport · Test recapitulativ' : 'Raport · Test final',
      subtitle: `Capitolul ${String(chapter).padStart(2, '0')} · ${clean(data.test.chapterTitle ?? data.test.economyRange)}`,
      shortTitle: `${recap ? 'Test recapitulativ' : 'Test final'} · Capitolul ${String(chapter).padStart(2, '0')}`,
    }
  }
  return {
    eyebrow: 'EVALUARE PENTRU ADMITERE',
    title: 'Raport · Test de admitere',
    subtitle: `${clean(data.test.session)} · ${clean(data.test.variant)} · întrebările ${clean(data.test.economyRange)}`,
    shortTitle: `Admitere · ${clean(data.test.variant)} · ${data.test.year}`,
  }
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + width, y, x + width, y + height, r)
  context.arcTo(x + width, y + height, x, y + height, r)
  context.arcTo(x, y + height, x, y, r)
  context.arcTo(x, y, x + width, y, r)
  context.closePath()
}

function fillRounded(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string, stroke?: string) {
  roundedRect(context, x, y, width, height, radius)
  context.fillStyle = fill
  context.fill()
  if (stroke) {
    context.strokeStyle = stroke
    context.lineWidth = 1
    context.stroke()
  }
}

function splitLongWord(context: CanvasRenderingContext2D, word: string, maxWidth: number) {
  const chunks: string[] = []
  let chunk = ''
  for (const character of word) {
    const candidate = `${chunk}${character}`
    if (chunk && context.measureText(candidate).width > maxWidth) {
      chunks.push(chunk)
      chunk = character
    } else chunk = candidate
  }
  if (chunk) chunks.push(chunk)
  return chunks
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const sourceWords = clean(text).split(' ').filter(Boolean)
  const words = sourceWords.flatMap((word) => context.measureText(word).width > maxWidth ? splitLongWord(context, word, maxWidth) : [word])
  const lines: string[] = []
  let line = ''
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
    } else line = candidate
  })
  if (line) lines.push(line)
  return lines.length ? lines : ['—']
}

function drawLines(context: CanvasRenderingContext2D, lines: string[], x: number, y: number, lineHeight: number) {
  lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight))
}

function scoreOf(data: AdmissionReportData) {
  return data.questions.reduce((total, question) => total + (data.answers[question.id] === question.correctOptionId ? 1 : 0), 0)
}

function newPage(): Page {
  const canvas = document.createElement('canvas')
  canvas.width = PAGE_WIDTH
  canvas.height = PAGE_HEIGHT
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Browserul nu poate genera raportul PDF.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT)
  return { canvas, context }
}

function drawBrandLine(context: CanvasRenderingContext2D, rightLabel: string) {
  fillRounded(context, MARGIN, 42, 40, 40, 9, COLORS.navy)
  context.textAlign = 'center'
  context.fillStyle = '#ffffff'
  context.font = '800 20px Arial, sans-serif'
  context.fillText('E', MARGIN + 20, 69)
  context.textAlign = 'left'
  context.fillStyle = COLORS.ink
  context.font = '800 17px Arial, sans-serif'
  context.fillText('Economie', 116, 59)
  context.fillStyle = COLORS.muted
  context.font = '12px Arial, sans-serif'
  context.fillText('by A mentor', 116, 78)
  context.textAlign = 'right'
  context.fillStyle = COLORS.quiet
  context.font = '700 11px Arial, sans-serif'
  context.fillText(rightLabel.toUpperCase(), PAGE_WIDTH - MARGIN, 66)
  context.textAlign = 'left'
  context.fillStyle = COLORS.line
  context.fillRect(MARGIN, 105, CONTENT_WIDTH, 1)
}

function scoreTone(percentage: number) {
  return percentage >= 70 ? COLORS.green : COLORS.coral
}

function drawScoreRing(context: CanvasRenderingContext2D, score: number, total: number, x: number, y: number) {
  const percentage = total ? Math.round(score / total * 100) : 0
  context.strokeStyle = '#e9eef0'
  context.lineWidth = 12
  context.beginPath()
  context.arc(x, y, 66, 0, Math.PI * 2)
  context.stroke()
  context.strokeStyle = scoreTone(percentage)
  context.lineCap = 'round'
  context.beginPath()
  context.arc(x, y, 66, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * percentage / 100)
  context.stroke()
  context.textAlign = 'center'
  context.fillStyle = COLORS.ink
  context.font = '800 34px Arial, sans-serif'
  context.fillText(`${percentage}%`, x, y + 4)
  context.fillStyle = COLORS.muted
  context.font = '12px Arial, sans-serif'
  context.fillText(`${score} din ${total}`, x, y + 28)
  context.textAlign = 'left'
  context.lineCap = 'butt'
}

function drawSummaryHeader(context: CanvasRenderingContext2D, data: AdmissionReportData, score: number) {
  const identity = reportIdentity(data)
  const generatedAt = data.generatedAt ?? new Date()
  drawBrandLine(context, 'Raport de evaluare')

  context.fillStyle = COLORS.teal
  context.font = '800 12px Arial, sans-serif'
  context.fillText(identity.eyebrow, MARGIN, 153)
  context.fillStyle = COLORS.ink
  context.font = '800 40px Arial, sans-serif'
  context.fillText(identity.title, MARGIN, 205)
  context.fillStyle = COLORS.muted
  context.font = '17px Arial, sans-serif'
  const subtitle = wrapText(context, identity.subtitle, 780).slice(0, 2)
  drawLines(context, subtitle, MARGIN, 244, 24)
  drawScoreRing(context, score, data.questions.length, 1067, 205)

  const detailsTop = 316
  const date = new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' }).format(generatedAt)
  const details = [
    ['Elev', clean(data.studentName) || '—'],
    ['Evaluare', identity.shortTitle],
    ['Timp', formatTime(data.elapsedSeconds)],
    ['Generat la', date],
  ]
  context.fillStyle = COLORS.lineStrong
  context.fillRect(MARGIN, detailsTop, CONTENT_WIDTH, 1)
  const columnWidth = CONTENT_WIDTH / details.length
  details.forEach(([label, value], index) => {
    const inset = index ? 24 : 0
    const x = MARGIN + index * columnWidth
    if (index) {
      context.fillStyle = COLORS.line
      context.fillRect(x, detailsTop + 22, 1, 58)
    }
    context.fillStyle = COLORS.quiet
    context.font = '800 10px Arial, sans-serif'
    context.fillText(label.toUpperCase(), x + inset, detailsTop + 28)
    context.fillStyle = COLORS.ink
    context.font = '700 15px Arial, sans-serif'
    drawLines(context, wrapText(context, value, columnWidth - inset - 20).slice(0, 2), x + inset, detailsTop + 57, 18)
  })
  context.fillStyle = COLORS.lineStrong
  context.fillRect(MARGIN, detailsTop + 100, CONTENT_WIDTH, 1)
}

function drawPerformanceOverview(context: CanvasRenderingContext2D, correct: number, total: number) {
  const wrong = Math.max(0, total - correct)
  const percentage = total ? Math.round(correct / total * 100) : 0
  const top = 464

  context.fillStyle = COLORS.ink
  context.font = '800 22px Arial, sans-serif'
  context.fillText('Rezultatul, dintr-o privire', MARGIN, top)
  context.fillStyle = COLORS.muted
  context.font = '14px Arial, sans-serif'
  context.fillText('O lectură clară a acurateții și a răspunsurilor care merită revizuite.', MARGIN, top + 27)

  const statTop = top + 62
  const statWidth = 205
  const statGap = 12
  ;[
    { label: 'CORECTE', value: correct, color: COLORS.green, soft: COLORS.greenSoft },
    { label: 'DE REVIZUIT', value: wrong, color: COLORS.red, soft: COLORS.redSoft },
  ].forEach((item, index) => {
    const x = MARGIN + index * (statWidth + statGap)
    fillRounded(context, x, statTop, statWidth, 148, 12, item.soft)
    context.fillStyle = item.color
    context.font = '800 10px Arial, sans-serif'
    context.fillText(item.label, x + 18, statTop + 29)
    context.font = '800 36px Arial, sans-serif'
    context.fillText(String(item.value).padStart(2, '0'), x + 18, statTop + 82)
    context.fillStyle = COLORS.muted
    context.font = '12px Arial, sans-serif'
    context.fillText(`din ${total}`, x + 75, statTop + 80)
    context.fillText(index === 0 ? 'răspunsuri validate' : 'răspunsuri de reluat', x + 18, statTop + 121)
  })

  const progressLeft = MARGIN + 486
  const progressWidth = CONTENT_WIDTH - 486
  context.fillStyle = COLORS.quiet
  context.font = '800 10px Arial, sans-serif'
  context.fillText('ACURATEȚE', progressLeft, statTop + 15)
  context.textAlign = 'right'
  context.fillStyle = scoreTone(percentage)
  context.font = '800 19px Arial, sans-serif'
  context.fillText(`${percentage}%`, progressLeft + progressWidth, statTop + 18)
  context.textAlign = 'left'

  const barTop = statTop + 48
  fillRounded(context, progressLeft, barTop, progressWidth, 18, 9, '#e8edef')
  if (percentage > 0) fillRounded(context, progressLeft, barTop, Math.max(18, progressWidth * percentage / 100), 18, 9, scoreTone(percentage))
  const thresholdX = progressLeft + progressWidth * .7
  context.fillStyle = COLORS.navy
  context.fillRect(thresholdX, barTop - 6, 2, 30)
  context.textAlign = 'center'
  context.fillStyle = COLORS.quiet
  context.font = '10px Arial, sans-serif'
  context.fillText('prag 70%', thresholdX, barTop + 47)
  context.textAlign = 'left'

  context.fillStyle = scoreTone(percentage)
  context.font = '700 13px Arial, sans-serif'
  context.fillText(percentage >= 70 ? 'Prag atins · rezultat stabil' : 'Sub prag · recapitularea este recomandată', progressLeft, statTop + 120)
  context.fillStyle = COLORS.muted
  context.font = '12px Arial, sans-serif'
  context.fillText(`${correct} răspunsuri corecte din ${total} întrebări evaluate`, progressLeft, statTop + 145)
}

function drawAnswerMap(context: CanvasRenderingContext2D, data: AdmissionReportData) {
  const top = 758
  context.fillStyle = COLORS.ink
  context.font = '800 20px Arial, sans-serif'
  context.fillText('Harta răspunsurilor', MARGIN, top)
  context.fillStyle = COLORS.muted
  context.font = '13px Arial, sans-serif'
  context.fillText('Fiecare poziție arată numărul întrebării și varianta aleasă.', MARGIN, top + 25)

  const columns = 15
  const gapX = 10
  const gapY = 10
  const cellWidth = (CONTENT_WIDTH - gapX * (columns - 1)) / columns
  const cellHeight = 48
  const gridTop = top + 54
  data.questions.forEach((question, index) => {
    const answer = data.answers[question.id]
    const correct = answer === question.correctOptionId
    const x = MARGIN + index % columns * (cellWidth + gapX)
    const y = gridTop + Math.floor(index / columns) * (cellHeight + gapY)
    fillRounded(context, x, y, cellWidth, cellHeight, 9, correct ? COLORS.greenSoft : COLORS.redSoft)
    context.fillStyle = correct ? COLORS.green : COLORS.red
    context.font = '800 9px Arial, sans-serif'
    context.fillText(String(question.originalNumber ?? index + 1).padStart(2, '0'), x + 10, y + 17)
    context.textAlign = 'right'
    context.font = '800 15px Arial, sans-serif'
    context.fillText(answer ? answer.toUpperCase() : '—', x + cellWidth - 10, y + 34)
    context.textAlign = 'left'
  })

  const rows = Math.max(1, Math.ceil(data.questions.length / columns))
  const gridBottom = gridTop + rows * cellHeight + (rows - 1) * gapY
  const legendY = gridBottom + 31
  context.fillStyle = COLORS.green
  context.beginPath(); context.arc(MARGIN + 5, legendY - 4, 5, 0, Math.PI * 2); context.fill()
  context.fillStyle = COLORS.muted
  context.font = '12px Arial, sans-serif'
  context.fillText('Corect', MARGIN + 17, legendY)
  context.fillStyle = COLORS.red
  context.beginPath(); context.arc(MARGIN + 99, legendY - 4, 5, 0, Math.PI * 2); context.fill()
  context.fillStyle = COLORS.muted
  context.fillText('Incorect sau fără răspuns', MARGIN + 111, legendY)
  return legendY + 57
}

function drawSummaryNote(context: CanvasRenderingContext2D, data: AdmissionReportData, score: number, requestedY: number) {
  const total = data.questions.length
  const percentage = total ? Math.round(score / total * 100) : 0
  const message = percentage >= 85
    ? 'Performanță foarte bună. Răspunsurile indică o stăpânire sigură a conceptelor evaluate.'
    : percentage >= 70
      ? 'Bază solidă. O scurtă revizuire a răspunsurilor marcate cu roșu poate fixa rezultatul.'
      : 'Prioritizează răspunsurile marcate cu roșu, apoi reia testul pentru a verifica progresul.'
  const y = Math.min(Math.max(requestedY, 1035), 1390)

  fillRounded(context, MARGIN, y, CONTENT_WIDTH, 155, 14, COLORS.navySoft)
  context.fillStyle = COLORS.teal
  context.fillRect(MARGIN, y + 18, 4, 119)
  context.fillStyle = COLORS.teal
  context.font = '800 10px Arial, sans-serif'
  context.fillText('RECOMANDARE', MARGIN + 25, y + 37)
  context.fillStyle = COLORS.ink
  context.font = '700 17px Arial, sans-serif'
  drawLines(context, wrapText(context, message, CONTENT_WIDTH - 70).slice(0, 2), MARGIN + 25, y + 72, 24)
  context.fillStyle = COLORS.muted
  context.font = '12px Arial, sans-serif'
  context.fillText('Analiza completă, răspunsurile corecte și explicațiile continuă pe paginile următoare.', MARGIN + 25, y + 124)
  return y + 192
}

function drawCategoryBreakdown(context: CanvasRenderingContext2D, data: AdmissionReportData, requestedY: number) {
  const groups = [
    { kind: 'teorie', label: 'Teorie' },
    { kind: 'exercitiu', label: 'Aplicații' },
    { kind: 'grila', label: 'Grile' },
  ].map((group) => {
    const questions = data.questions.filter((question) => question.kind === group.kind)
    const correct = questions.filter((question) => data.answers[question.id] === question.correctOptionId).length
    return { ...group, total: questions.length, correct }
  }).filter((group) => group.total)
  if (!groups.length) return
  const y = Math.min(requestedY, 1505)
  context.fillStyle = COLORS.quiet
  context.font = '800 10px Arial, sans-serif'
  context.fillText('REZULTAT PE TIP DE ÎNTREBARE', MARGIN, y)
  const gap = 34
  const width = (CONTENT_WIDTH - gap * (groups.length - 1)) / groups.length
  groups.forEach((group, index) => {
    const x = MARGIN + index * (width + gap)
    const ratio = group.correct / group.total
    context.fillStyle = COLORS.ink
    context.font = '700 14px Arial, sans-serif'
    context.fillText(group.label, x, y + 35)
    context.textAlign = 'right'
    context.fillStyle = COLORS.muted
    context.font = '700 12px Arial, sans-serif'
    context.fillText(`${group.correct}/${group.total}`, x + width, y + 35)
    context.textAlign = 'left'
    fillRounded(context, x, y + 53, width, 8, 4, '#e8edef')
    if (ratio) fillRounded(context, x, y + 53, Math.max(8, width * ratio), 8, 4, ratio >= .7 ? COLORS.green : COLORS.coral)
  })
}

function drawContinuationHeader(context: CanvasRenderingContext2D, data: AdmissionReportData) {
  drawBrandLine(context, reportIdentity(data).shortTitle)
  context.fillStyle = COLORS.teal
  context.fillRect(MARGIN, 104, 92, 3)
}

interface QuestionLayout {
  question: NormalizedQuestion
  correct: boolean
  prompt: string[]
  studentAnswer: string[]
  correctAnswer: string[]
  formula: string[]
  explanation: string[]
  studentHeight: number
  correctHeight: number
  formulaHeight: number
  height: number
}

function questionLayout(context: CanvasRenderingContext2D, question: NormalizedQuestion, answerId: string | undefined): QuestionLayout {
  const selected = question.options.find((option) => option.id === answerId)
  const expected = question.options.find((option) => option.id === question.correctOptionId)
  context.font = '800 18px Arial, sans-serif'
  const prompt = wrapText(context, question.prompt, CONTENT_WIDTH)
  context.font = '14px Arial, sans-serif'
  const answerWidth = CONTENT_WIDTH - 232
  const studentAnswer = wrapText(context, answerId ? `${answerId.toUpperCase()} — ${selected?.text ?? 'variantă indisponibilă'}` : 'Fără răspuns', answerWidth)
  const correctAnswer = wrapText(context, `${question.correctOptionId.toUpperCase()} — ${expected?.text ?? 'variantă indisponibilă'}`, answerWidth)
  context.font = '13px Arial, sans-serif'
  const formula = question.formula ? wrapText(context, question.formula, answerWidth) : []
  const explanation = wrapText(context, question.explanation, CONTENT_WIDTH)
  const studentHeight = Math.max(54, 24 + studentAnswer.length * 19)
  const correctHeight = Math.max(54, 24 + correctAnswer.length * 19)
  const formulaHeight = formula.length ? Math.max(52, 22 + formula.length * 19) : 0
  const height = 46 + prompt.length * 24 + 22 + studentHeight + 8 + correctHeight + (formulaHeight ? 8 + formulaHeight : 0) + 58 + explanation.length * 19 + 28
  return { question, correct: answerId === question.correctOptionId, prompt, studentAnswer, correctAnswer, formula, explanation, studentHeight, correctHeight, formulaHeight, height }
}

function drawInfoRow(context: CanvasRenderingContext2D, y: number, height: number, label: string, lines: string[], tone: 'student' | 'correct' | 'formula', isCorrect: boolean) {
  const palette = tone === 'formula'
    ? { fill: COLORS.goldSoft, label: COLORS.gold, value: COLORS.gold }
    : tone === 'correct'
      ? { fill: COLORS.surface, label: COLORS.muted, value: COLORS.green }
      : { fill: isCorrect ? COLORS.greenSoft : COLORS.redSoft, label: COLORS.muted, value: isCorrect ? COLORS.green : COLORS.red }
  fillRounded(context, MARGIN, y, CONTENT_WIDTH, height, 9, palette.fill)
  context.fillStyle = palette.label
  context.font = '800 10px Arial, sans-serif'
  context.fillText(label, MARGIN + 18, y + 29)
  context.fillStyle = palette.value
  context.font = tone === 'formula' ? '13px "Courier New", monospace' : '700 14px Arial, sans-serif'
  drawLines(context, lines, MARGIN + 214, y + 29, 19)
}

function drawQuestion(context: CanvasRenderingContext2D, layout: QuestionLayout, y: number, fallbackNumber: number) {
  const { question, correct } = layout
  const accent = correct ? COLORS.green : COLORS.red
  const soft = correct ? COLORS.greenSoft : COLORS.redSoft
  let cursor = y

  fillRounded(context, MARGIN, cursor, 36, 28, 8, soft)
  context.fillStyle = accent
  context.font = '800 10px Arial, sans-serif'
  context.textAlign = 'center'
  context.fillText(String(question.originalNumber ?? fallbackNumber).padStart(2, '0'), MARGIN + 18, cursor + 19)
  context.textAlign = 'right'
  context.fillStyle = accent
  context.font = '800 10px Arial, sans-serif'
  context.fillText(correct ? 'RĂSPUNS CORECT' : 'DE REVIZUIT', PAGE_WIDTH - MARGIN, cursor + 19)
  context.textAlign = 'left'
  cursor += 46

  context.fillStyle = COLORS.ink
  context.font = '800 18px Arial, sans-serif'
  drawLines(context, layout.prompt, MARGIN, cursor, 24)
  cursor += layout.prompt.length * 24 + 22

  drawInfoRow(context, cursor, layout.studentHeight, 'RĂSPUNSUL ELEVULUI', layout.studentAnswer, 'student', correct)
  cursor += layout.studentHeight + 8
  drawInfoRow(context, cursor, layout.correctHeight, 'RĂSPUNSUL CORECT', layout.correctAnswer, 'correct', correct)
  cursor += layout.correctHeight

  if (layout.formulaHeight) {
    cursor += 8
    drawInfoRow(context, cursor, layout.formulaHeight, 'FORMULĂ', layout.formula, 'formula', correct)
    cursor += layout.formulaHeight
  }

  cursor += 31
  context.fillStyle = COLORS.teal
  context.font = '800 10px Arial, sans-serif'
  context.fillText('REZOLVARE', MARGIN, cursor)
  cursor += 27
  context.fillStyle = '#485f6b'
  context.font = '13px Arial, sans-serif'
  drawLines(context, layout.explanation, MARGIN, cursor, 19)
  context.fillStyle = COLORS.line
  context.fillRect(MARGIN, y + layout.height - 1, CONTENT_WIDTH, 1)
}

function drawOversizedQuestion(pages: Page[], data: AdmissionReportData, layout: QuestionLayout, fallbackNumber: number) {
  const availableHeight = DETAIL_BOTTOM - DETAIL_TOP
  const scale = availableHeight / layout.height
  const page = newPage()
  pages.push(page)
  drawContinuationHeader(page.context, data)
  const scaledWidth = CONTENT_WIDTH * scale
  page.context.save()
  page.context.translate(MARGIN + (CONTENT_WIDTH - scaledWidth) / 2, DETAIL_TOP)
  page.context.scale(scale, scale)
  page.context.translate(-MARGIN, 0)
  drawQuestion(page.context, layout, 0, fallbackNumber)
  page.context.restore()
}

function drawFooter(context: CanvasRenderingContext2D, page: number, pageCount: number) {
  context.fillStyle = COLORS.line
  context.fillRect(MARGIN, PAGE_HEIGHT - 59, CONTENT_WIDTH, 1)
  context.fillStyle = COLORS.quiet
  context.font = '10px Arial, sans-serif'
  context.fillText('Economie by A mentor · raport generat local', MARGIN, PAGE_HEIGHT - 31)
  context.textAlign = 'right'
  context.fillText(`Pagina ${String(page).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 31)
  context.textAlign = 'left'
}

function jpegBytes(canvas: HTMLCanvasElement) {
  const encoded = canvas.toDataURL('image/jpeg', .95).split(',')[1]
  const binary = window.atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function admissionReportFilename(data: AdmissionReportData) {
  if (isChapterReport(data)) {
    const chapter = data.test.chapterNumber ?? data.test.year
    const testType = data.test.kind === 'recap' ? 'test-recapitulativ' : 'test-final'
    return `raport-${testType}-capitol-${String(chapter).padStart(2, '0')}-${safeFilename(data.studentName)}.pdf`
  }
  return `raport-admitere-${data.test.year}-${data.test.variant.toLowerCase()}-${safeFilename(data.studentName)}.pdf`
}

export function renderAssessmentReportPages(data: AdmissionReportData) {
  const score = scoreOf(data)
  const pages: Page[] = [newPage()]
  const placements: Array<{ page: number; y: number; height: number; scale: number }> = []
  drawSummaryHeader(pages[0].context, data, score)
  drawPerformanceOverview(pages[0].context, score, data.questions.length)
  const summaryNoteY = drawAnswerMap(pages[0].context, data)
  const breakdownY = drawSummaryNote(pages[0].context, data, score, summaryNoteY)
  drawCategoryBreakdown(pages[0].context, data, breakdownY)

  let detailPage = newPage()
  pages.push(detailPage)
  drawContinuationHeader(detailPage.context, data)
  let cursor = DETAIL_TOP
  const availableHeight = DETAIL_BOTTOM - DETAIL_TOP

  data.questions.forEach((question, index) => {
    let layout = questionLayout(detailPage.context, question, data.answers[question.id])
    if (layout.height > availableHeight) {
      if (cursor === DETAIL_TOP) pages.pop()
      drawOversizedQuestion(pages, data, layout, index + 1)
      placements.push({ page: pages.length, y: DETAIL_TOP, height: layout.height, scale: availableHeight / layout.height })
      detailPage = newPage()
      pages.push(detailPage)
      drawContinuationHeader(detailPage.context, data)
      cursor = DETAIL_TOP
      return
    }
    if (cursor > DETAIL_TOP && cursor + layout.height > DETAIL_BOTTOM) {
      detailPage = newPage()
      pages.push(detailPage)
      drawContinuationHeader(detailPage.context, data)
      cursor = DETAIL_TOP
      layout = questionLayout(detailPage.context, question, data.answers[question.id])
    }
    drawQuestion(detailPage.context, layout, cursor, index + 1)
    placements.push({ page: pages.length, y: cursor, height: layout.height, scale: 1 })
    cursor += layout.height + 25
  })

  if (pages.length > 2 && cursor === DETAIL_TOP) pages.pop()
  pages.forEach(({ context }, index) => drawFooter(context, index + 1, pages.length))
  return { pages: pages.map(({ canvas }) => canvas), score, placements }
}

export async function createAdmissionReportPdf(data: AdmissionReportData) {
  const rendered = renderAssessmentReportPages(data)
  const pdf = buildImagePdf(rendered.pages.map((canvas) => ({ width: PAGE_WIDTH, height: PAGE_HEIGHT, jpeg: jpegBytes(canvas) })))
  return { blob: pdf, filename: admissionReportFilename(data), score: rendered.score, total: data.questions.length, pageCount: rendered.pages.length }
}

export async function downloadAdmissionReport(data: AdmissionReportData) {
  const report = await createAdmissionReportPdf(data)
  downloadBlob(report.blob, report.filename)
  return report
}

export async function emailAdmissionReport(data: AdmissionReportData): Promise<AdmissionEmailResult> {
  if (!data.studentEmail) throw new Error('Adresa de e-mail a elevului lipsește.')
  const report = await createAdmissionReportPdf(data)
  const identity = reportIdentity(data)
  const bytes = new Uint8Array(await report.blob.arrayBuffer())
  let binary = ''
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  const response = await fetch('/api/report-service/emails/test-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...sessionHeaders() },
    body: JSON.stringify({
      recipient_email: data.studentEmail,
      student_name: data.studentName,
      test_title: identity.shortTitle,
      report_kind: data.test.kind === 'recap' ? 'recap' : isChapterReport(data) ? 'final' : 'admission',
      score: report.score,
      total: report.total,
      elapsed_seconds: data.elapsedSeconds,
      completed_at: (data.generatedAt ?? new Date()).toISOString(),
      request_id: globalThis.crypto?.randomUUID?.() ?? `report-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      pdf_filename: report.filename,
      pdf_base64: btoa(binary),
    }),
  })
  const payload = await response.json().catch(() => null) as {
    status?: string
    message_id?: string
    recipient?: string
    detail?: string | { message?: string }
  } | null
  if (!response.ok) {
    const detail = payload?.detail
    const message = typeof detail === 'string' ? detail : detail?.message
    throw new Error(message || 'Raportul nu a putut fi trimis prin e-mail.')
  }
  return {
    status: 'sent',
    messageId: payload?.message_id ?? 'sent',
    recipient: payload?.recipient ?? data.studentEmail,
    filename: report.filename,
  }
}
