/**
 * useMdtably
 *
 * Composable powering the Mdtably tool: converts CSV input into a
 * GitHub-Flavored Markdown table whose `|` separators are perfectly
 * aligned in monospace (so the source itself reads like a real table,
 * not just one that renders nicely).
 *
 * Each column gets:
 *   - A computed width = max(header length, longest cell, alignment
 *     minimum). The alignment minimum exists so that `:---:` doesn't
 *     get clipped on narrow columns.
 *   - A padding strategy driven by the per-column alignment: left
 *     pads with spaces on the right, right on the left, center splits
 *     the slack and `none` defaults to left-style padding without
 *     emitting the `:` markers in the separator row.
 *
 * The CSV parser is the same hand-rolled state machine used by
 * {@link useCsvJson}: handles quoted cells, escaped doubled quotes
 * and CRLF/LF line endings.
 */

/** Per-column alignment marker. `none` produces `---`, with no colons. */
export type Alignment = 'left' | 'center' | 'right' | 'none'

/** All alignment options in display order. */
export const ALIGNMENTS: Alignment[] = ['none', 'left', 'center', 'right']

/** Options forwarded to {@link useMdtably.buildMarkdown}. */
export interface MdtablyOptions {
  hasHeader: boolean
  /** Per-column alignment, indexed by column. Missing entries default to `'none'`. */
  alignments: Alignment[]
}

/**
 * Stateful CSV parser. Mirrors `useCsvJson.parseCsv` so this composable
 * stays self-contained (no cross-import). Quotes inside a cell are
 * escaped by doubling them (`""` → `"`).
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
 * Escape a cell value so it can sit safely inside a Markdown table cell:
 *   - Newlines become `<br>` (Markdown tables collapse a cell to one line).
 *   - Vertical bars are backslash-escaped.
 *   - Surrounding whitespace is trimmed so alignment isn't thrown off.
 */
const escapeCell = (s: string): string =>
  s.replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|').trim()

/**
 * "Display width" measured in Unicode code points. Counts each surrogate
 * pair (emoji, astral character) as one column. Not a true monospace
 * width — CJK ideographs will appear slightly off in editor previews —
 * but the output is always valid Markdown.
 */
const cellWidth = (s: string): number => [...s].length

/** Minimum dashes needed in the separator row, given the alignment. */
const minSeparatorWidth = (a: Alignment): number => {
  if (a === 'center') return 5 // ":---:"
  if (a === 'left' || a === 'right') return 4 // ":---" or "---:"
  return 3 // "---"
}

/** Pad `text` to `width` columns using the column's alignment rule. */
const padCell = (text: string, width: number, align: Alignment): string => {
  const slack = width - cellWidth(text)
  if (slack <= 0) return text
  if (align === 'right') return ' '.repeat(slack) + text
  if (align === 'center') {
    const left = Math.floor(slack / 2)
    const right = slack - left
    return ' '.repeat(left) + text + ' '.repeat(right)
  }
  return text + ' '.repeat(slack)
}

/** Build the separator-row segment for a single column. */
const separatorSegment = (width: number, align: Alignment): string => {
  if (align === 'left') return ':' + '-'.repeat(width - 1)
  if (align === 'right') return '-'.repeat(width - 1) + ':'
  if (align === 'center') return ':' + '-'.repeat(width - 2) + ':'
  return '-'.repeat(width)
}

export const useMdtably = () => {
  /** Parse `text` as CSV with the chosen `delimiter`. */
  const parse = (text: string, delimiter: string): string[][] => {
    if (text.length === 0) return []
    return parseCsv(text, delimiter).filter((row) =>
      row.some((c) => c.length > 0),
    )
  }

  /**
   * Convert pre-parsed `rows` into a pretty-printed Markdown table. When
   * `hasHeader` is false, the first column is decorated with synthetic
   * `Column N` headers so the output is still valid.
   */
  const buildMarkdown = (
    rows: string[][],
    opts: MdtablyOptions,
  ): string => {
    if (rows.length === 0) return ''

    const colCount = Math.max(...rows.map((r) => r.length))

    // Right-pad ragged rows to a uniform shape and escape every cell.
    const grid = rows.map((r) => {
      const padded = [...r]
      while (padded.length < colCount) padded.push('')
      return padded.map(escapeCell)
    })

    const headerRow = opts.hasHeader
      ? grid[0]
      : Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`)
    const dataRows = opts.hasHeader ? grid.slice(1) : grid

    // Width = max content + alignment minimum.
    const widths = new Array(colCount).fill(0)
    for (const row of [headerRow, ...dataRows]) {
      for (let i = 0; i < colCount; i++) {
        const w = cellWidth(row[i])
        if (w > widths[i]) widths[i] = w
      }
    }
    for (let i = 0; i < colCount; i++) {
      const a = opts.alignments[i] ?? 'none'
      const minW = minSeparatorWidth(a)
      if (widths[i] < minW) widths[i] = minW
    }

    const header =
      '| ' +
      headerRow
        .map((c, i) => padCell(c, widths[i], opts.alignments[i] ?? 'none'))
        .join(' | ') +
      ' |'
    const separator =
      '| ' +
      widths
        .map((w, i) => separatorSegment(w, opts.alignments[i] ?? 'none'))
        .join(' | ') +
      ' |'
    const body = dataRows.map(
      (row) =>
        '| ' +
        row
          .map((c, i) => padCell(c, widths[i], opts.alignments[i] ?? 'none'))
          .join(' | ') +
        ' |',
    )

    return [header, separator, ...body].join('\n')
  }

  /**
   * Best-guess delimiter detection: counts each candidate across the
   * first 10 non-empty lines and returns the one with the highest
   * count and lowest variance (so a candidate that appears
   * consistently wins over one that appears wildly in a single line).
   */
  const detectDelimiter = (text: string): string => {
    const candidates = [',', ';', '\t', '|']
    const lines = text
      .split(/\r?\n/)
      .filter((l) => l.length > 0)
      .slice(0, 10)
    if (lines.length === 0) return ','

    let best = ','
    let bestScore = -Infinity
    for (const d of candidates) {
      const escaped = d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(escaped, 'g')
      const counts = lines.map((l) => (l.match(re) || []).length)
      if (counts.some((c) => c === 0)) continue
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length
      const variance =
        counts.reduce((a, b) => a + (b - avg) ** 2, 0) / counts.length
      const score = avg - variance
      if (score > bestScore) {
        best = d
        bestScore = score
      }
    }
    return best
  }

  return { parse, buildMarkdown, detectDelimiter }
}
