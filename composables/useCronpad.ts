/**
 * useCronpad
 *
 * Composable powering the Cronpad tool: a self-contained parser,
 * validator and iterator for standard 5-field cron expressions
 * (`minute hour day-of-month month day-of-week`).
 *
 * Supports:
 *  - Wildcards (`*`), single values, ranges (`1-5`), lists (`1,3,5`),
 *    steps (`* /5`, `1-30/5`, `5/10`).
 *  - Named months/weekdays (`JAN`..`DEC`, `SUN`..`SAT`, case-insensitive).
 *  - Day-of-week `7` aliased to `0` (Sunday).
 *  - Presets: `@yearly`/`@annually`, `@monthly`, `@weekly`, `@daily`/
 *    `@midnight`, `@hourly`. `@reboot` is reported as unsupported
 *    because it has no fixed schedule.
 *
 * Parser output keeps both the original AST (so the UI can produce a
 * natural-language description) and a fully expanded `Set<number>` per
 * field (so matching is O(1) per check).
 *
 * Date matching follows classic Unix cron semantics: when *both*
 * day-of-month and day-of-week are restricted (i.e. neither is `*`), a
 * date matches if it satisfies *either* — not both.
 */

/** Logical name of each cron field, used in errors and field specs. */
export type FieldName = 'minute' | 'hour' | 'dom' | 'month' | 'dow'

/** Smallest unit of a parsed cron field. Used to build {@link FieldAst}. */
export type Atom =
  | { kind: 'star' }
  | { kind: 'value'; n: number }
  | { kind: 'range'; from: number; to: number }
  | {
      kind: 'step'
      base: { kind: 'star' } | { kind: 'value'; n: number } | { kind: 'range'; from: number; to: number }
      step: number
    }

/** Whole field AST: either a single Atom or a comma-separated list. */
export type FieldAst = Atom | { kind: 'list'; items: Atom[] }

/** Static description of a field's valid range and optional name table. */
export interface FieldSpec {
  name: FieldName
  min: number
  max: number
  /** Optional mapping from textual aliases (JAN, MON…) to numeric values. */
  names?: Record<string, number>
}

/** Structured parse error, ready to be translated by the UI. */
export interface ParseError {
  /** Stable identifier (e.g. `field_count`, `invalid_step`). */
  code: string
  /** Which field caused the error, when applicable. */
  field?: FieldName
  /** The raw token that triggered the error. */
  value?: string
}

/** Canonical month name aliases (case-insensitive, uppercase here). */
const MONTH_NAMES: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
}
/** Canonical day-of-week aliases. `0` and `7` both mean Sunday. */
const DOW_NAMES: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
}

/** Field range/alias spec for every position in a 5-field cron. */
const SPECS: Record<FieldName, FieldSpec> = {
  minute: { name: 'minute', min: 0, max: 59 },
  hour: { name: 'hour', min: 0, max: 23 },
  dom: { name: 'dom', min: 1, max: 31 },
  month: { name: 'month', min: 1, max: 12, names: MONTH_NAMES },
  dow: { name: 'dow', min: 0, max: 6, names: DOW_NAMES },
}

/** Preset shorthands; `@reboot` is intentionally absent (handled in `parse`). */
const PRESETS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
}

/**
 * Parse a single token (no `-`, `,` or `/`) into the integer it
 * represents, accepting both numeric and name forms. Returns `null` on
 * any failure: bad alias, non-integer, out-of-range value.
 */
const parseSingle = (s: string, spec: FieldSpec): number | null => {
  const up = s.toUpperCase()
  if (spec.names && up in spec.names) return spec.names[up]
  if (!/^-?\d+$/.test(s)) return null
  const n = Number(s)
  if (spec.name === 'dow' && n === 7) return 0
  if (n < spec.min || n > spec.max) return null
  return n
}

/**
 * Parse one comma-free, range-or-step-aware atom into the AST. Returns
 * a {@link ParseError} object (with a `code` field) on any malformed
 * input — checked by the caller using `'code' in result`.
 */
const parseAtom = (token: string, spec: FieldSpec): Atom | ParseError => {
  if (token === '*') return { kind: 'star' }

  if (token.includes('/')) {
    const idx = token.indexOf('/')
    const baseStr = token.slice(0, idx)
    const stepStr = token.slice(idx + 1)
    if (!/^\d+$/.test(stepStr)) return { code: 'invalid_step', field: spec.name, value: token }
    const step = Number(stepStr)
    if (step < 1) return { code: 'invalid_step', field: spec.name, value: token }

    if (baseStr === '*') return { kind: 'step', base: { kind: 'star' }, step }
    if (baseStr.includes('-')) {
      const [fs, ts] = baseStr.split('-')
      const f = parseSingle(fs, spec)
      const t = parseSingle(ts, spec)
      if (f === null || t === null) return { code: 'invalid_range', field: spec.name, value: token }
      return { kind: 'step', base: { kind: 'range', from: f, to: t }, step }
    }
    const v = parseSingle(baseStr, spec)
    if (v === null) return { code: 'invalid_value', field: spec.name, value: token }
    return { kind: 'step', base: { kind: 'value', n: v }, step }
  }

  if (token.includes('-')) {
    const [fs, ts] = token.split('-')
    const f = parseSingle(fs, spec)
    const t = parseSingle(ts, spec)
    if (f === null || t === null) return { code: 'invalid_range', field: spec.name, value: token }
    return { kind: 'range', from: f, to: t }
  }

  const v = parseSingle(token, spec)
  if (v === null) return { code: 'invalid_value', field: spec.name, value: token }
  return { kind: 'value', n: v }
}

/**
 * Parse a whole field, splitting on commas to build a `list` AST when
 * needed. Empty fields are reported as `empty_field`.
 */
const parseField = (raw: string, spec: FieldSpec): FieldAst | ParseError => {
  if (raw.length === 0) return { code: 'empty_field', field: spec.name }
  if (raw.includes(',')) {
    const tokens = raw.split(',')
    const items: Atom[] = []
    for (const t of tokens) {
      const a = parseAtom(t.trim(), spec)
      if ('code' in a) return a
      items.push(a)
    }
    return { kind: 'list', items }
  }
  return parseAtom(raw, spec)
}

/**
 * Expand a single atom into the concrete list of integer values it
 * represents. Steps are evaluated relative to the base's starting
 * value (e.g. `5/10` over 0..59 yields 5, 15, 25, 35, 45, 55).
 */
const expandAtom = (atom: Atom, spec: FieldSpec): number[] => {
  switch (atom.kind) {
    case 'star': {
      const out: number[] = []
      for (let i = spec.min; i <= spec.max; i++) out.push(i)
      return out
    }
    case 'value':
      return [atom.n]
    case 'range': {
      const from = Math.min(atom.from, atom.to)
      const to = Math.max(atom.from, atom.to)
      const r: number[] = []
      for (let i = from; i <= to; i++) r.push(i)
      return r
    }
    case 'step': {
      let baseValues: number[]
      let startAt: number
      if (atom.base.kind === 'star') {
        baseValues = []
        for (let i = spec.min; i <= spec.max; i++) baseValues.push(i)
        startAt = spec.min
      } else if (atom.base.kind === 'value') {
        baseValues = []
        for (let i = atom.base.n; i <= spec.max; i++) baseValues.push(i)
        startAt = atom.base.n
      } else {
        const from = Math.min(atom.base.from, atom.base.to)
        const to = Math.max(atom.base.from, atom.base.to)
        baseValues = []
        for (let i = from; i <= to; i++) baseValues.push(i)
        startAt = from
      }
      return baseValues.filter((v) => (v - startAt) % atom.step === 0)
    }
  }
}

/** Union the expansions of every atom in `ast` into a single set. */
const expandField = (ast: FieldAst, spec: FieldSpec): Set<number> => {
  const out = new Set<number>()
  if (ast.kind === 'list') {
    for (const a of ast.items) for (const v of expandAtom(a, spec)) out.add(v)
  } else {
    for (const v of expandAtom(ast, spec)) out.add(v)
  }
  return out
}

/** Successful parse result with both the AST and the expanded sets. */
export interface ParsedCron {
  valid: true
  /** The user's original input (trimmed). */
  raw: string
  /** The 5-field expression after any `@…` preset was expanded. */
  expanded: string
  /** Per-field AST, used to build the human description. */
  fields: {
    minute: FieldAst
    hour: FieldAst
    dom: FieldAst
    month: FieldAst
    dow: FieldAst
  }
  /** `true` if day-of-month is `*`; needed for cron's OR-semantics. */
  domStar: boolean
  /** `true` if day-of-week is `*`; needed for cron's OR-semantics. */
  dowStar: boolean
  /** Per-field expanded sets, used for O(1) matching. */
  sets: {
    minute: Set<number>
    hour: Set<number>
    dom: Set<number>
    month: Set<number>
    dow: Set<number>
  }
}

/** Result returned when parsing fails. */
export interface InvalidCron {
  valid: false
  raw: string
  error: ParseError
}

/** Discriminated union returned by {@link useCronpad.parse}. */
export type ParseResult = ParsedCron | InvalidCron

/** True iff the AST is the bare `*` wildcard (not even a 1-item list). */
const isStar = (f: FieldAst): boolean => f.kind === 'star'

export const useCronpad = () => {
  /**
   * Parse a cron expression. Trimming, lower-casing for preset lookup
   * and `@reboot` rejection happen here; everything else is delegated
   * to {@link parseField}. Returns a discriminated union — narrow with
   * `result.valid`.
   */
  const parse = (input: string): ParseResult => {
    const raw = input.trim()
    if (raw.length === 0) return { valid: false, raw, error: { code: 'empty' } }
    let expr = raw
    const lower = expr.toLowerCase()
    if (lower === '@reboot') return { valid: false, raw, error: { code: 'reboot_not_supported' } }
    if (lower in PRESETS) expr = PRESETS[lower]

    const tokens = expr.split(/\s+/)
    if (tokens.length !== 5) return { valid: false, raw, error: { code: 'field_count' } }

    const order: FieldName[] = ['minute', 'hour', 'dom', 'month', 'dow']
    const parsed: Partial<ParsedCron['fields']> = {}
    for (let i = 0; i < 5; i++) {
      const name = order[i]
      const result = parseField(tokens[i], SPECS[name])
      if ('code' in result) return { valid: false, raw, error: result }
      ;(parsed as Record<FieldName, FieldAst>)[name] = result
    }
    const f = parsed as ParsedCron['fields']
    return {
      valid: true,
      raw,
      expanded: expr,
      fields: f,
      domStar: isStar(f.dom),
      dowStar: isStar(f.dow),
      sets: {
        minute: expandField(f.minute, SPECS.minute),
        hour: expandField(f.hour, SPECS.hour),
        dom: expandField(f.dom, SPECS.dom),
        month: expandField(f.month, SPECS.month),
        dow: expandField(f.dow, SPECS.dow),
      },
    }
  }

  /**
   * Return `true` iff the given `Date` falls on a minute that the
   * expression fires. Implements the classic Unix cron OR-rule for the
   * day fields (see file-level docs).
   */
  const matches = (parsed: ParsedCron, d: Date): boolean => {
    if (!parsed.sets.month.has(d.getMonth() + 1)) return false
    if (!parsed.sets.hour.has(d.getHours())) return false
    if (!parsed.sets.minute.has(d.getMinutes())) return false
    const domMatch = parsed.sets.dom.has(d.getDate())
    const dowMatch = parsed.sets.dow.has(d.getDay())
    if (parsed.domStar && parsed.dowStar) return true
    if (parsed.domStar) return dowMatch
    if (parsed.dowStar) return domMatch
    return domMatch || dowMatch
  }

  /**
   * Find the next `count` firing times of the expression strictly after
   * `from`. Uses field-by-field skipping instead of minute-by-minute
   * iteration so sparse schedules like `0 0 29 2 *` finish in
   * milliseconds. Capped at 50 years ahead and 5M loop iterations as a
   * safety net for pathological inputs.
   */
  const nextRuns = (parsed: ParsedCron, from: Date, count: number): Date[] => {
    const out: Date[] = []
    let d = new Date(from.getTime())
    d.setSeconds(0, 0)
    d = new Date(d.getTime() + 60_000)

    const limitYear = d.getFullYear() + 50
    const MAX = 5_000_000
    let iter = 0
    while (out.length < count && iter < MAX) {
      iter++
      if (d.getFullYear() > limitYear) break
      if (!parsed.sets.month.has(d.getMonth() + 1)) {
        let m = d.getMonth() + 1
        let y = d.getFullYear()
        if (m > 11) {
          m = 0
          y++
        }
        d = new Date(y, m, 1, 0, 0, 0, 0)
        continue
      }
      const domMatch = parsed.sets.dom.has(d.getDate())
      const dowMatch = parsed.sets.dow.has(d.getDay())
      const dayOk =
        parsed.domStar && parsed.dowStar
          ? true
          : parsed.domStar
            ? dowMatch
            : parsed.dowStar
              ? domMatch
              : domMatch || dowMatch
      if (!dayOk) {
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0)
        continue
      }
      if (!parsed.sets.hour.has(d.getHours())) {
        d = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours() + 1, 0, 0, 0)
        continue
      }
      if (!parsed.sets.minute.has(d.getMinutes())) {
        d = new Date(d.getTime() + 60_000)
        continue
      }
      out.push(new Date(d))
      d = new Date(d.getTime() + 60_000)
    }
    return out
  }

  return { parse, matches, nextRuns, PRESETS }
}
