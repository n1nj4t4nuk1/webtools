/**
 * useCsvJson
 *
 * Composable powering the CsvJson tool: detects whether a pasted blob
 * is JSON or CSV, auto-detects the CSV delimiter from `,`/`;`/tab/`|`
 * and converts in either direction. The CSV parser is implemented
 * inline (no library) and handles quoted cells, doubled-quote escapes
 * (`""` → `"`) and CRLF/LF line endings.
 */

/** Result of {@link useCsvJson.detectFormat}. */
export type DetectedFormat = 'json' | 'csv' | 'empty' | 'unknown'

/** Delimiters considered when auto-detecting CSV. */
export type Delimiter = ',' | ';' | '\t' | '|'

const DELIM_CANDIDATES: Delimiter[] = [',', ';', '\t', '|']

/** Escape a string so it can be used inside a `new RegExp(...)`. */
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const useCsvJson = () => {
  /**
   * Decide whether `text` looks like JSON or CSV. Anything starting with
   * `{` or `[` is parsed as JSON; success → `json`, failure → `unknown`.
   * Everything else (non-empty) is assumed to be `csv`.
   */
  const detectFormat = (text: string): DetectedFormat => {
    const trimmed = text.trim()
    if (trimmed.length === 0) return 'empty'
    if (trimmed[0] === '{' || trimmed[0] === '[') {
      try {
        JSON.parse(trimmed)
        return 'json'
      } catch {
        return 'unknown'
      }
    }
    return 'csv'
  }

  /**
   * Best-effort delimiter detection: pick the candidate that appears
   * the most consistently across the first 10 non-empty lines.
   * "Consistently" = high mean count, low variance across lines. Any
   * delimiter that's missing from at least one line is discarded.
   */
  const detectDelimiter = (text: string): Delimiter => {
    const lines = text
      .split(/\r?\n/)
      .filter((l) => l.length > 0)
      .slice(0, 10)
    if (lines.length === 0) return ','

    let best: Delimiter = ','
    let bestScore = -Infinity
    for (const delim of DELIM_CANDIDATES) {
      const re = new RegExp(escapeRegex(delim), 'g')
      const counts = lines.map((l) => (l.match(re) || []).length)
      if (counts.some((c) => c === 0)) continue
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length
      const variance =
        counts.reduce((a, b) => a + (b - avg) ** 2, 0) / counts.length
      const score = avg - variance
      if (score > bestScore) {
        best = delim
        bestScore = score
      }
    }
    return best
  }

  /**
   * Stateful character-by-character CSV parser. Handles RFC 4180-style
   * quoting: a cell beginning with `"` is read until the matching `"`,
   * and a doubled `""` inside a quoted cell becomes a single `"`. Lone
   * `\r` characters are skipped so CRLF and LF both work.
   */
  const parseCsv = (text: string, delimiter: string): string[][] => {
    const rows: string[][] = []
    let current: string[] = []
    let cell = ''
    let inQuotes = false
    let cellStarted = false
    let i = 0
    while (i < text.length) {
      const ch = text[i]
      if (inQuotes) {
        if (ch === '"' && text[i + 1] === '"') {
          cell += '"'
          i += 2
          continue
        }
        if (ch === '"') {
          inQuotes = false
          i++
          continue
        }
        cell += ch
        i++
        continue
      }
      if (ch === '"' && !cellStarted) {
        inQuotes = true
        cellStarted = true
        i++
        continue
      }
      if (ch === delimiter) {
        current.push(cell)
        cell = ''
        cellStarted = false
        i++
        continue
      }
      if (ch === '\r') {
        i++
        continue
      }
      if (ch === '\n') {
        current.push(cell)
        rows.push(current)
        current = []
        cell = ''
        cellStarted = false
        i++
        continue
      }
      cell += ch
      cellStarted = true
      i++
    }
    if (cellStarted || current.length > 0) {
      current.push(cell)
      rows.push(current)
    }
    return rows
  }

  /**
   * Convert CSV text to JSON. When `hasHeader` is true, the first row
   * becomes the object keys for every subsequent row (missing cells
   * default to empty string). Otherwise, a plain string[][] is returned.
   */
  const csvToJson = (
    text: string,
    delimiter: string,
    hasHeader: boolean,
  ): unknown => {
    const rows = parseCsv(text, delimiter)
    if (rows.length === 0) return []
    if (!hasHeader) return rows
    const [header, ...data] = rows
    return data.map((row) => {
      const obj: Record<string, string> = {}
      header.forEach((key, i) => {
        obj[key] = row[i] ?? ''
      })
      return obj
    })
  }

  /**
   * Serialize one cell. Anything that contains the delimiter, a quote
   * or a newline gets wrapped in `"..."` with internal quotes doubled.
   * `null`/`undefined` become empty strings and nested objects/arrays
   * are stringified as JSON.
   */
  const escapeCsvCell = (raw: unknown, delimiter: string): string => {
    let s: string
    if (raw === null || raw === undefined) s = ''
    else if (typeof raw === 'object') s = JSON.stringify(raw)
    else s = String(raw)
    if (
      s.includes(delimiter) ||
      s.includes('"') ||
      s.includes('\n') ||
      s.includes('\r')
    ) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  /**
   * Convert JSON text to CSV. Accepts either an array of plain objects
   * (the header is the union of their keys, in first-seen order), an
   * array of arrays (no header, rows written as-is) or a single object
   * (treated as an array of one). Mixed shapes throw `MIXED_SHAPE`.
   */
  const jsonToCsv = (text: string, delimiter: string): string => {
    const parsed = JSON.parse(text)
    let arr: unknown[]
    if (Array.isArray(parsed)) arr = parsed
    else if (parsed && typeof parsed === 'object') arr = [parsed]
    else throw new Error('NOT_TABULAR')

    if (arr.length === 0) return ''

    const allObjects = arr.every(
      (item) => item !== null && typeof item === 'object' && !Array.isArray(item),
    )

    if (allObjects) {
      const keys: string[] = []
      const seen = new Set<string>()
      for (const obj of arr as Record<string, unknown>[]) {
        for (const k of Object.keys(obj)) {
          if (!seen.has(k)) {
            seen.add(k)
            keys.push(k)
          }
        }
      }
      const lines = [keys.map((k) => escapeCsvCell(k, delimiter)).join(delimiter)]
      for (const obj of arr as Record<string, unknown>[]) {
        lines.push(keys.map((k) => escapeCsvCell(obj[k], delimiter)).join(delimiter))
      }
      return lines.join('\n')
    }

    const allArrays = arr.every((item) => Array.isArray(item))
    if (allArrays) {
      return (arr as unknown[][])
        .map((row) => row.map((c) => escapeCsvCell(c, delimiter)).join(delimiter))
        .join('\n')
    }

    throw new Error('MIXED_SHAPE')
  }

  return {
    detectFormat,
    detectDelimiter,
    csvToJson,
    jsonToCsv,
  }
}
