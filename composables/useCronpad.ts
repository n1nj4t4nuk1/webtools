export type FieldName = 'minute' | 'hour' | 'dom' | 'month' | 'dow'

export type Atom =
  | { kind: 'star' }
  | { kind: 'value'; n: number }
  | { kind: 'range'; from: number; to: number }
  | {
      kind: 'step'
      base: { kind: 'star' } | { kind: 'value'; n: number } | { kind: 'range'; from: number; to: number }
      step: number
    }

export type FieldAst = Atom | { kind: 'list'; items: Atom[] }

export interface FieldSpec {
  name: FieldName
  min: number
  max: number
  names?: Record<string, number>
}

export interface ParseError {
  code: string
  field?: FieldName
  value?: string
}

const MONTH_NAMES: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
}
const DOW_NAMES: Record<string, number> = {
  SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6,
}

const SPECS: Record<FieldName, FieldSpec> = {
  minute: { name: 'minute', min: 0, max: 59 },
  hour: { name: 'hour', min: 0, max: 23 },
  dom: { name: 'dom', min: 1, max: 31 },
  month: { name: 'month', min: 1, max: 12, names: MONTH_NAMES },
  dow: { name: 'dow', min: 0, max: 6, names: DOW_NAMES },
}

const PRESETS: Record<string, string> = {
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
  '@monthly': '0 0 1 * *',
  '@weekly': '0 0 * * 0',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@hourly': '0 * * * *',
}

const parseSingle = (s: string, spec: FieldSpec): number | null => {
  const up = s.toUpperCase()
  if (spec.names && up in spec.names) return spec.names[up]
  if (!/^-?\d+$/.test(s)) return null
  const n = Number(s)
  if (spec.name === 'dow' && n === 7) return 0
  if (n < spec.min || n > spec.max) return null
  return n
}

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

const expandField = (ast: FieldAst, spec: FieldSpec): Set<number> => {
  const out = new Set<number>()
  if (ast.kind === 'list') {
    for (const a of ast.items) for (const v of expandAtom(a, spec)) out.add(v)
  } else {
    for (const v of expandAtom(ast, spec)) out.add(v)
  }
  return out
}

export interface ParsedCron {
  valid: true
  raw: string
  expanded: string
  fields: {
    minute: FieldAst
    hour: FieldAst
    dom: FieldAst
    month: FieldAst
    dow: FieldAst
  }
  domStar: boolean
  dowStar: boolean
  sets: {
    minute: Set<number>
    hour: Set<number>
    dom: Set<number>
    month: Set<number>
    dow: Set<number>
  }
}

export interface InvalidCron {
  valid: false
  raw: string
  error: ParseError
}

export type ParseResult = ParsedCron | InvalidCron

const isStar = (f: FieldAst): boolean => f.kind === 'star'

export const useCronpad = () => {
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
