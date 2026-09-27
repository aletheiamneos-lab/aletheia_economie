import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const sourceRoot = process.argv[2] ?? 'E:\\A mentor\\Economie\\Manuale Economie Teorie'
const destinationRoot = path.resolve('public/library')

const chapterTitles = [
  'Introducere în economie',
  'Sistemul economic',
  'Consumatorul',
  'Factorii de producție',
  'Productivitatea',
  'Costurile',
  'Profitul și renta',
  'Piața',
  'Concurența',
  'Banii și piața monetară',
  'Inflația',
  'Piața financiară',
  'Piața muncii',
  'Șomajul',
  'Venitul, consumul și investițiile',
  'Creștere și dezvoltare economică. Ciclicitatea în economie',
  'Statul în economia de piață',
  'Piața mondială',
  'Integrare economică și globalizare',
]

const alternativeTitles = [
  ['Corvin', 'Manual de economie pentru clasele XI–XII · Corvin'],
  ['Cosea', 'Manual de economie · Coșea'],
  ['Gavrila', 'Manual de economie pentru clasa a XI-a · Gavrilă, Nițescu, Ghiță și Popescu'],
  ['Lacatus', 'Manual de economie pentru clasa a XI-a · Lăcătuș'],
]

async function collectPdfFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) return collectPdfFiles(fullPath)
    return entry.isFile() && path.extname(entry.name).toLowerCase() === '.pdf' ? [fullPath] : []
  }))
  return nested.flat()
}

const pdfFiles = await collectPdfFiles(sourceRoot)
await mkdir(destinationRoot, { recursive: true })

const resources = []
for (let chapter = 1; chapter <= chapterTitles.length; chapter += 1) {
  const source = pdfFiles.find((file) => new RegExp(`^Capitolul ${chapter}(?:\\D|$)`, 'i').test(path.basename(file)))
  if (!source) throw new Error(`Lipsește PDF-ul pentru capitolul ${chapter}.`)
  const fileName = `capitol-${String(chapter).padStart(2, '0')}.pdf`
  await copyFile(source, path.join(destinationRoot, fileName))
  const { size } = await import('node:fs/promises').then(({ stat }) => stat(source))
  resources.push({
    id: `capitol-${chapter}`,
    group: 'capitole',
    chapter,
    title: chapterTitles[chapter - 1],
    fileName,
    url: `/library/${fileName}`,
    size,
  })
}

const generalSource = pdfFiles.find((file) => path.basename(file).startsWith('Economie 2012'))
if (!generalSource) throw new Error('Lipsește manualul general de economie.')
await copyFile(generalSource, path.join(destinationRoot, 'manual-economie-corint-2012.pdf'))
const { size: generalSize } = await import('node:fs/promises').then(({ stat }) => stat(generalSource))
resources.push({
  id: 'manual-general-corint-2012',
  group: 'manuale',
  title: 'Manual de economie · Corint 2012',
  fileName: 'manual-economie-corint-2012.pdf',
  url: '/library/manual-economie-corint-2012.pdf',
  size: generalSize,
})

for (const [index, [needle, title]] of alternativeTitles.entries()) {
  const source = pdfFiles.find((file) => path.basename(file).includes(needle))
  if (!source) throw new Error(`Lipsește manualul alternativ: ${needle}.`)
  const fileName = `manual-alternativ-${index + 1}.pdf`
  await copyFile(source, path.join(destinationRoot, fileName))
  const { size } = await import('node:fs/promises').then(({ stat }) => stat(source))
  resources.push({
    id: `manual-alternativ-${index + 1}`,
    group: 'manuale',
    title,
    fileName,
    url: `/library/${fileName}`,
    size,
  })
}

await writeFile(
  path.join(destinationRoot, 'manifest.json'),
  `${JSON.stringify({ generatedAt: new Date().toISOString(), resources }, null, 2)}\n`,
  'utf8',
)

console.log(`Biblioteca a fost importată: ${resources.length} PDF-uri în ${destinationRoot}`)
