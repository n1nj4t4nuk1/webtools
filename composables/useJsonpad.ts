export interface JsonValidation {
  valid: boolean
  parsed: unknown
  error: { line: number | null; col: number | null; msg: string } | null
}

export interface JsonStats {
  bytes: number
  keys: number
  depth: number
  arrays: number
  objects: number
}

const posToLineCol = (
  text: string,
  pos: number,
): { line: number; col: number } => {
  let line = 1
  let col = 1
  const limit = Math.min(pos, text.length)
  for (let i = 0; i < limit; i++) {
    if (text[i] === '\n') {
      line++
      col = 1
    } else {
      col++
    }
  }
  return { line, col }
}

export const useJsonpad = () => {
  const validate = (text: string): JsonValidation => {
    if (text.trim().length === 0) {
      return { valid: false, parsed: null, error: null }
    }
    try {
      const parsed = JSON.parse(text)
      return { valid: true, parsed, error: null }
    } catch (err) {
      const msg = (err as Error).message
      const posMatch = msg.match(/position (\d+)/)
      if (posMatch) {
        const { line, col } = posToLineCol(text, Number(posMatch[1]))
        return { valid: false, parsed: null, error: { line, col, msg } }
      }
      const lcMatch = msg.match(/line (\d+) column (\d+)/)
      if (lcMatch) {
        return {
          valid: false,
          parsed: null,
          error: { line: Number(lcMatch[1]), col: Number(lcMatch[2]), msg },
        }
      }
      return { valid: false, parsed: null, error: { line: null, col: null, msg } }
    }
  }

  const format = (parsed: unknown, indent: number | string): string => {
    return JSON.stringify(parsed, null, indent)
  }

  const minify = (parsed: unknown): string => {
    return JSON.stringify(parsed)
  }

  const sortKeys = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sortKeys)
    if (value !== null && typeof value === 'object') {
      const obj = value as Record<string, unknown>
      return Object.keys(obj)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = sortKeys(obj[key])
          return acc
        }, {})
    }
    return value
  }

  const stats = (text: string, parsed: unknown): JsonStats => {
    let keys = 0
    let arrays = 0
    let objects = 0
    const walk = (v: unknown, currentDepth: number): number => {
      if (Array.isArray(v)) {
        arrays++
        let max = currentDepth
        for (const item of v) max = Math.max(max, walk(item, currentDepth + 1))
        return max
      }
      if (v !== null && typeof v === 'object') {
        objects++
        const obj = v as Record<string, unknown>
        const keyList = Object.keys(obj)
        keys += keyList.length
        let max = currentDepth
        for (const k of keyList) max = Math.max(max, walk(obj[k], currentDepth + 1))
        return max
      }
      return currentDepth
    }
    const depth = walk(parsed, 0)
    const bytes = new TextEncoder().encode(text).length
    return { bytes, keys, depth, arrays, objects }
  }

  return { validate, format, minify, sortKeys, stats }
}
