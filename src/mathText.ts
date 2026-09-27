export type MathTextToken =
  | { type: 'text'; value: string }
  | { type: 'fraction'; numerator: string; denominator: string }

export type MathScriptToken =
  | { type: 'text'; value: string }
  | { type: 'superscript' | 'subscript'; value: string }

const fractionPattern = /\{([^{}\n]+)\}\s*\/\s*\{([^{}\n]+)\}|([\p{L}\d.,%]+)\s*\/\s*([\p{L}\d.,%]+)/gu

export function parseMathText(value: string): MathTextToken[] {
  const tokens: MathTextToken[] = []
  let cursor = 0

  for (const match of value.matchAll(fractionPattern)) {
    const index = match.index ?? 0
    if (index > cursor) tokens.push({ type: 'text', value: value.slice(cursor, index) })
    tokens.push({
      type: 'fraction',
      numerator: (match[1] ?? match[3]).trim(),
      denominator: (match[2] ?? match[4]).trim(),
    })
    cursor = index + match[0].length
  }

  if (cursor < value.length) tokens.push({ type: 'text', value: value.slice(cursor) })
  return tokens.length ? tokens : [{ type: 'text', value }]
}

export function replaceMathSymbols(value: string) {
  return value
    .replace(/\bsqrt\s*\(/gi, '√(')
    .replace(/\s\*\s/g, ' × ')
    .replace(/\s->\s/g, ' → ')
    .replace(/\s<=\s/g, ' ≤ ')
    .replace(/\s>=\s/g, ' ≥ ')
}

export function parseMathScripts(value: string): MathScriptToken[] {
  const tokens: MathScriptToken[] = []
  const pattern = /\^\{([^{}]+)\}|_\{([^{}]+)\}/g
  let cursor = 0

  for (const match of value.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > cursor) tokens.push({ type: 'text', value: value.slice(cursor, index) })
    tokens.push(match[1]
      ? { type: 'superscript', value: match[1] }
      : { type: 'subscript', value: match[2] })
    cursor = index + match[0].length
  }

  if (cursor < value.length) tokens.push({ type: 'text', value: value.slice(cursor) })
  return tokens.length ? tokens : [{ type: 'text', value }]
}

export function mathDraftAsPlainText(title: string, content: string) {
  return `${title.trim() || 'Fișă de matematică'}\n${'='.repeat(Math.max(8, (title.trim() || 'Fișă de matematică').length))}\n\n${content}\n`
}
