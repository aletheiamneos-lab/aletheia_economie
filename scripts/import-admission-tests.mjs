import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(scriptDirectory, '..')
const sourceRoot = 'E:\\A mentor\\Economie\\#Documente Aplictie\\Grile Economie Admitere'
const targetRoot = path.join(projectRoot, 'public', 'admission-tests')
const dataRoot = path.join(targetRoot, 'data')
const optionIds = ['a', 'b', 'c', 'd']

const filenames = (await readdir(sourceRoot))
  .filter((filename) => /^Grila_.+\.json$/i.test(filename))
  .sort((left, right) => left.localeCompare(right, 'ro'))

if (!filenames.length) throw new Error(`Nu există fișiere JSON în ${sourceRoot}.`)
await mkdir(dataRoot, { recursive: true })

let totalQuestions = 0
let formulaQuestions = 0
const tests = []

for (const filename of filenames) {
  const sourcePath = path.join(sourceRoot, filename)
  const data = JSON.parse(await readFile(sourcePath, 'utf8'))
  if (!Number.isInteger(data.an) || !data.sesiune || !data.varianta || !Array.isArray(data.grupe)) {
    throw new Error(`Structură invalidă în ${filename}.`)
  }

  const questions = data.grupe.flatMap((group) => {
    if (!Array.isArray(group.exercitii) || group.numar_exercitii !== group.exercitii.length) {
      throw new Error(`Numărul declarat al exercițiilor nu corespunde în ${filename}, grupa ${group.grupa}.`)
    }
    return group.exercitii
  })
  const numbers = new Set()
  for (const question of questions) {
    const keys = Object.keys(question.optiuni ?? {}).sort()
    if (keys.join('|') !== optionIds.join('|')) throw new Error(`Opțiuni incomplete în ${filename}, întrebarea ${question.numar_in_test}.`)
    if (!optionIds.includes(question.raspuns_corect) || !question.optiuni[question.raspuns_corect]) throw new Error(`Răspuns invalid în ${filename}, întrebarea ${question.numar_in_test}.`)
    if (!String(question.rezolvare ?? '').trim()) throw new Error(`Rezolvare lipsă în ${filename}, întrebarea ${question.numar_in_test}.`)
    if (numbers.has(question.numar_in_test)) throw new Error(`Număr duplicat în ${filename}: ${question.numar_in_test}.`)
    numbers.add(question.numar_in_test)
    if (question.formula_utilizata) formulaQuestions += 1
  }

  totalQuestions += questions.length
  const id = filename
    .replace(/^Grila_/i, '')
    .replace(/\.json$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
  const difficultyCounts = Object.fromEntries(data.grupe.map((group) => [group.nivel_dificultate, group.exercitii.length]))

  tests.push({
    id,
    year: data.an,
    session: data.sesiune,
    variant: data.varianta,
    filename,
    questionCount: questions.length,
    economyRange: data.interval_economie_in_test,
    difficultyCounts,
    subjectSource: data.sursa_subiecte,
    answerSource: data.sursa_barem,
    note: data.nota ?? null,
  })
  await copyFile(sourcePath, path.join(dataRoot, filename))
}

tests.sort((left, right) => right.year - left.year || left.session.localeCompare(right.session, 'ro') || left.variant.localeCompare(right.variant, 'ro'))
const manifest = {
  version: 1,
  testCount: tests.length,
  totalQuestions,
  formulaQuestions,
  yearRange: [Math.min(...tests.map((test) => test.year)), Math.max(...tests.map((test) => test.year))],
  tests,
}

await writeFile(path.join(targetRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ targetRoot, tests: tests.length, totalQuestions, formulaQuestions }, null, 2))
