interface TextItem {
  label: string
  value: string
}

export interface GraphExportSnapshot {
  chapterNumber: number
  chapterTitle: string
  graphTitle: string
  graphNote: string
  svg: SVGSVGElement
  indicators: TextItem[]
  parameters: TextItem[]
  formulas: string[]
}

interface ExportContext {
  chapterNumber: number
  chapterTitle: string
  configuredFormulas: string[]
}

const clean = (value: string | null | undefined) => (value ?? '').replace(/\s+/g, ' ').trim()

function unique(values: string[]) {
  return [...new Set(values.map(clean).filter(Boolean))]
}

function fieldLabel(control: HTMLInputElement | HTMLSelectElement) {
  const field = control.closest('.field')
  const directLabel = field?.querySelector('label')?.textContent
  if (directLabel) return clean(directLabel)

  const cell = control.closest('td')
  const row = cell?.parentElement
  const table = control.closest('table')
  if (cell && row && table) {
    const column = Array.from(row.children).indexOf(cell)
    const heading = table.querySelectorAll('th')[column]?.textContent
    const firstCell = row.querySelector('td')?.textContent
    return clean([firstCell, heading].filter(Boolean).join(' · '))
  }

  return clean(control.getAttribute('aria-label') || control.id || control.name || 'Valoare')
}

function processDiagramSvg(document: Document) {
  const boxes = Array.from(document.querySelectorAll<HTMLElement>('.processBox'))
  if (!boxes.length) return null
  const namespace = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(namespace, 'svg')
  svg.setAttribute('viewBox', '0 0 960 540')
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', 'Fazele activității economice')

  const background = document.createElementNS(namespace, 'rect')
  background.setAttribute('width', '960')
  background.setAttribute('height', '540')
  background.setAttribute('fill', '#ffffff')
  svg.append(background)

  const count = boxes.length
  const boxWidth = Math.min(178, (790 - (count - 1) * 54) / count)
  const totalWidth = count * boxWidth + (count - 1) * 54
  const startX = (960 - totalWidth) / 2
  boxes.forEach((box, index) => {
    const x = startX + index * (boxWidth + 54)
    const active = box.classList.contains('active')
    if (index) {
      const arrow = document.createElementNS(namespace, 'text')
      arrow.setAttribute('x', String(x - 27))
      arrow.setAttribute('y', '278')
      arrow.setAttribute('text-anchor', 'middle')
      arrow.setAttribute('font-size', '30')
      arrow.setAttribute('fill', '#78909c')
      arrow.textContent = '→'
      svg.append(arrow)
    }
    const rectangle = document.createElementNS(namespace, 'rect')
    rectangle.setAttribute('x', String(x))
    rectangle.setAttribute('y', '215')
    rectangle.setAttribute('width', String(boxWidth))
    rectangle.setAttribute('height', '105')
    rectangle.setAttribute('rx', '14')
    rectangle.setAttribute('fill', active ? '#e7f0f5' : '#f8fafc')
    rectangle.setAttribute('stroke', active ? '#163a59' : '#d8e2ea')
    rectangle.setAttribute('stroke-width', active ? '3' : '2')
    svg.append(rectangle)

    const words = clean(box.textContent).split(' ')
    const lines: string[] = []
    let line = ''
    words.forEach((word) => {
      if (`${line} ${word}`.trim().length > 18 && line) {
        lines.push(line)
        line = word
      } else line = `${line} ${word}`.trim()
    })
    if (line) lines.push(line)
    lines.slice(0, 3).forEach((text, lineIndex) => {
      const label = document.createElementNS(namespace, 'text')
      label.setAttribute('x', String(x + boxWidth / 2))
      label.setAttribute('y', String(255 + lineIndex * 19 - (lines.length - 1) * 8))
      label.setAttribute('text-anchor', 'middle')
      label.setAttribute('font-size', '13')
      label.setAttribute('font-weight', active ? '800' : '650')
      label.setAttribute('fill', '#163a59')
      label.textContent = text
      svg.append(label)
    })
  })
  return svg
}

export function collectGraphExportSnapshot(document: Document, context: ExportContext): GraphExportSnapshot {
  const svg = document.querySelector<SVGSVGElement>('#plot, .graphCard svg, #content svg') ?? processDiagramSvg(document)
  if (!svg) throw new Error('Graficul activ nu a fost găsit.')

  const indicators = Array.from(document.querySelectorAll<HTMLElement>('.metric')).map((metric) => ({
    label: clean(metric.querySelector('small')?.textContent) || 'Indicator',
    value: clean(metric.querySelector('b')?.textContent) || '—',
  }))

  const parameters = Array.from(document.querySelectorAll<HTMLInputElement | HTMLSelectElement>('.sidePanel input, .sidePanel select'))
    .filter((control) => control.type !== 'range' && control.type !== 'checkbox')
    .map((control) => ({
      label: fieldLabel(control),
      value: control.tagName === 'SELECT'
        ? clean((control as HTMLSelectElement).selectedOptions[0]?.textContent || control.value)
        : clean(control.value),
    }))

  const visibleFormulas = Array.from(document.querySelectorAll<HTMLElement>('.formula')).map((formula) => clean(formula.textContent))
  const equationInputs = Array.from(document.querySelectorAll<HTMLInputElement>('#dEqText, #sEqText')).map((input) => clean(input.value))

  return {
    chapterNumber: context.chapterNumber,
    chapterTitle: context.chapterTitle,
    graphTitle: clean(document.querySelector('.graphHead h2')?.textContent) || 'Grafic economic',
    graphNote: clean(document.querySelector('.graphHead small')?.textContent),
    svg,
    indicators,
    parameters,
    formulas: unique([...context.configuredFormulas, ...equationInputs, ...visibleFormulas]),
  }
}

function safeFilename(value: string) {
  const normalized = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  return normalized.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().slice(0, 72) || 'grafic-economic'
}

function cloneSvg(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const viewBox = svg.viewBox.baseVal
  const width = viewBox.width || 960
  const height = viewBox.height || 540
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  const style = clone.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent = 'text{font-family:Arial,sans-serif}.axisTag text{font-size:9px;font-weight:700}'
  clone.insertBefore(style, clone.firstChild)
  return clone
}

async function svgImage(svg: SVGSVGElement) {
  const source = new XMLSerializer().serializeToString(cloneSvg(svg))
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = new Image()
    image.decoding = 'async'
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

function drawHeader(context: CanvasRenderingContext2D, snapshot: GraphExportSnapshot, width: number, height: number) {
  context.fillStyle = '#163a59'
  context.fillRect(0, 0, width, height)
  context.fillStyle = '#80ced3'
  context.fillRect(0, height - 8, width, 8)
  context.fillStyle = '#ffffff'
  context.font = '700 26px Arial, sans-serif'
  context.fillText(`Capitolul ${String(snapshot.chapterNumber).padStart(2, '0')} · ${snapshot.chapterTitle}`, 52, 52)
  context.font = '800 42px Arial, sans-serif'
  context.fillText(snapshot.graphTitle, 52, 105)
  if (snapshot.graphNote) {
    context.fillStyle = '#d8e8ef'
    context.font = '20px Arial, sans-serif'
    context.fillText(snapshot.graphNote.slice(0, 115), 52, 140)
  }
}

async function graphCanvas(snapshot: GraphExportSnapshot) {
  const image = await svgImage(snapshot.svg)
  const canvas = document.createElement('canvas')
  canvas.width = 1920
  canvas.height = 1260
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Browserul nu poate genera imaginea graficului.')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  drawHeader(context, snapshot, canvas.width, 180)
  const viewBox = snapshot.svg.viewBox.baseVal
  const sourceWidth = viewBox.width || 960
  const sourceHeight = viewBox.height || 540
  const scale = Math.min(1920 / sourceWidth, 1080 / sourceHeight)
  const width = sourceWidth * scale
  const height = sourceHeight * scale
  context.drawImage(image, (1920 - width) / 2, 180 + (1080 - height) / 2, width, height)
  return canvas
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export async function downloadGraphPng(snapshot: GraphExportSnapshot) {
  const canvas = await graphCanvas(snapshot)
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Fișierul PNG nu a putut fi creat.')), 'image/png')
  })
  downloadBlob(blob, `capitol-${String(snapshot.chapterNumber).padStart(2, '0')}-${safeFilename(snapshot.graphTitle)}.png`)
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = clean(text).split(' ')
  const lines: string[] = []
  let line = ''
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  })
  if (line) lines.push(line)
  return lines.length ? lines : ['—']
}

function prepareReportLines(snapshot: GraphExportSnapshot, context: CanvasRenderingContext2D) {
  context.font = '24px Arial, sans-serif'
  const blocks = [
    { title: 'Indicatori calculați', values: snapshot.indicators.map((item) => `${item.label}: ${item.value}`) },
    { title: 'Date și parametri utilizați', values: snapshot.parameters.map((item) => `${item.label}: ${item.value}`) },
    { title: 'Ecuații și formule', values: snapshot.formulas },
  ]
  return blocks.map((block) => ({
    title: block.title,
    lines: block.values.length
      ? block.values.flatMap((value) => wrapText(context, value, 1190))
      : ['Nu există elemente pentru acest grafic.'],
  }))
}

async function reportCanvas(snapshot: GraphExportSnapshot) {
  const graph = await graphCanvas(snapshot)
  const measureCanvas = document.createElement('canvas')
  const measure = measureCanvas.getContext('2d')
  if (!measure) throw new Error('Raportul PDF nu poate fi măsurat.')
  const blocks = prepareReportLines(snapshot, measure)
  const pageHeight = Math.round(1400 * 297 / 210)
  const ensureRoom = (position: number, required: number) => {
    const pagePosition = position % pageHeight
    return pagePosition + required > pageHeight - 65 ? position + pageHeight - pagePosition + 70 : position
  }
  let layoutY = 995
  const layout = blocks.map((block) => {
    layoutY = ensureRoom(layoutY, 125)
    const titleY = layoutY
    layoutY += 73
    const lineYs = block.lines.map(() => {
      layoutY = ensureRoom(layoutY, 45)
      const lineY = layoutY
      layoutY += 35
      return lineY
    })
    layoutY += 25
    return { ...block, titleY, lineYs }
  })
  const canvas = document.createElement('canvas')
  canvas.width = 1400
  canvas.height = Math.ceil((layoutY + 70) / pageHeight) * pageHeight
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Raportul PDF nu poate fi generat.')

  context.fillStyle = '#f5f7fa'
  context.fillRect(0, 0, canvas.width, canvas.height)
  drawHeader(context, snapshot, canvas.width, 170)

  context.fillStyle = '#ffffff'
  context.fillRect(55, 210, 1290, 726)
  context.drawImage(graph, 0, 180, 1920, 1080, 75, 225, 1250, 703)

  layout.forEach((block) => {
    context.fillStyle = '#163a59'
    context.font = '800 29px Arial, sans-serif'
    context.fillText(block.title, 70, block.titleY)
    context.fillStyle = '#d7e2ea'
    context.fillRect(70, block.titleY + 42, 1260, 2)
    context.fillStyle = '#24344d'
    context.font = '24px Arial, sans-serif'
    block.lines.forEach((line, index) => {
      context.fillText(`• ${line}`, 88, block.lineYs[index])
    })
  })

  return canvas
}

function ascii(value: string) {
  return new TextEncoder().encode(value)
}

function jpegBytes(canvas: HTMLCanvasElement) {
  const encoded = canvas.toDataURL('image/jpeg', 0.93).split(',')[1]
  const binary = window.atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export function buildImagePdf(pages: Array<{ width: number; height: number; jpeg: Uint8Array }>) {
  const chunks: Uint8Array[] = []
  const offsets: number[] = [0]
  let byteLength = 0
  const push = (part: Uint8Array | string) => {
    const bytes = typeof part === 'string' ? ascii(part) : part
    chunks.push(bytes)
    byteLength += bytes.length
  }
  const object = (id: number, body: string | Uint8Array, dictionary = '') => {
    offsets[id] = byteLength
    push(`${id} 0 obj\n`)
    if (body instanceof Uint8Array) {
      push(`${dictionary}\nstream\n`)
      push(body)
      push('\nendstream\n')
    } else {
      push(body)
      push('\n')
    }
    push('endobj\n')
  }

  push('%PDF-1.4\n% offline export\n')
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  const pageIds = pages.map((_, index) => 3 + index * 3)
  object(2, `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`)

  pages.forEach((page, index) => {
    const pageId = pageIds[index]
    const imageId = pageId + 1
    const contentId = pageId + 2
    const content = ascii('q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ')
    object(pageId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`)
    object(imageId, page.jpeg, `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>`)
    object(contentId, content, `<< /Length ${content.length} >>`)
  })

  const xrefOffset = byteLength
  const objectCount = 2 + pages.length * 3
  push(`xref\n0 ${objectCount + 1}\n`)
  push('0000000000 65535 f \n')
  for (let id = 1; id <= objectCount; id += 1) push(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)
  const output = new Uint8Array(byteLength)
  let cursor = 0
  chunks.forEach((chunk) => {
    output.set(chunk, cursor)
    cursor += chunk.length
  })
  return new Blob([output.buffer], { type: 'application/pdf' })
}

export async function downloadGraphPdf(snapshot: GraphExportSnapshot) {
  const report = await reportCanvas(snapshot)
  const pageWidth = 1400
  const pageHeight = Math.round(pageWidth * 297 / 210)
  const pageCount = Math.max(1, Math.ceil(report.height / pageHeight))
  const pages = Array.from({ length: pageCount }, (_, pageIndex) => {
    const canvas = document.createElement('canvas')
    canvas.width = pageWidth
    canvas.height = pageHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Pagina PDF nu poate fi generată.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, pageWidth, pageHeight)
    context.drawImage(report, 0, -pageIndex * pageHeight)
    return { width: pageWidth, height: pageHeight, jpeg: jpegBytes(canvas) }
  })
  const pdf = buildImagePdf(pages)
  downloadBlob(pdf, `capitol-${String(snapshot.chapterNumber).padStart(2, '0')}-${safeFilename(snapshot.graphTitle)}.pdf`)
}
