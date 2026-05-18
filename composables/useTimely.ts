/**
 * useTimely
 *
 * Composable powering the Timely tool: converts between the most
 * common timestamp formats — Unix seconds, Unix milliseconds, ISO 8601
 * (UTC and local with offset) and RFC 2822 — so editing one field
 * automatically refreshes every other field. Also exposes helpers for
 * the surrounding UI: relative phrase ("2 hours ago"), weekday name in
 * the user's locale, and the current timezone offset label.
 */

/** All timestamp formats Timely can render or parse. */
export type TimelyFormat = 'unixS' | 'unixMs' | 'isoUtc' | 'isoLocal' | 'rfc2822'

/** Formats in display order. */
export const FORMATS: TimelyFormat[] = ['unixS', 'unixMs', 'isoUtc', 'isoLocal', 'rfc2822']

const pad2 = (n: number) => String(n).padStart(2, '0')
const pad3 = (n: number) => String(n).padStart(3, '0')

/**
 * Format `date` as a local ISO 8601 string (with timezone offset),
 * since `Date.prototype.toISOString` only emits UTC.
 */
const isoLocal = (date: Date): string => {
  const offsetMin = -date.getTimezoneOffset()
  const sign = offsetMin >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMin)
  const offH = pad2(Math.floor(abs / 60))
  const offM = pad2(abs % 60)
  return (
    `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}` +
    `T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}.${pad3(date.getMilliseconds())}` +
    `${sign}${offH}:${offM}`
  )
}

export const useTimely = () => {
  /** Stringify `date` in the requested format. */
  const format = (date: Date, fmt: TimelyFormat): string => {
    const ms = date.getTime()
    switch (fmt) {
      case 'unixS':
        return String(Math.floor(ms / 1000))
      case 'unixMs':
        return String(ms)
      case 'isoUtc':
        return date.toISOString()
      case 'isoLocal':
        return isoLocal(date)
      case 'rfc2822':
        return date.toUTCString()
    }
  }

  /**
   * Parse `raw` according to `fmt`. Returns `null` on any failure: empty
   * input, malformed digits for the numeric formats, or a `Date` whose
   * `getTime()` is `NaN` (which Date will silently produce for invalid
   * ISO/RFC strings).
   */
  const parse = (raw: string, fmt: TimelyFormat): Date | null => {
    const trimmed = raw.trim()
    if (trimmed.length === 0) return null
    if (fmt === 'unixS') {
      if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null
      const n = Number(trimmed)
      if (!Number.isFinite(n)) return null
      const d = new Date(n * 1000)
      return Number.isNaN(d.getTime()) ? null : d
    }
    if (fmt === 'unixMs') {
      if (!/^-?\d+$/.test(trimmed)) return null
      const n = Number(trimmed)
      if (!Number.isFinite(n)) return null
      const d = new Date(n)
      return Number.isNaN(d.getTime()) ? null : d
    }
    const d = new Date(trimmed)
    return Number.isNaN(d.getTime()) ? null : d
  }

  /**
   * Make a best guess at which format an input string represents, used
   * by the UI to switch the active field automatically when the user
   * pastes a value. Returns `null` for ambiguous or empty input.
   */
  const detect = (raw: string): TimelyFormat | null => {
    const trimmed = raw.trim()
    if (trimmed.length === 0) return null
    if (/^-?\d{1,10}(\.\d+)?$/.test(trimmed)) return 'unixS'
    if (/^-?\d{11,16}$/.test(trimmed)) return 'unixMs'
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      return trimmed.endsWith('Z') ? 'isoUtc' : 'isoLocal'
    }
    if (/^[A-Za-z]{3,},\s/.test(trimmed)) return 'rfc2822'
    return null
  }

  /**
   * Localised relative-time phrase ("3 hours ago", "in 2 days") via
   * `Intl.RelativeTimeFormat`. Picks the largest unit whose magnitude
   * is still ≥1 so the output reads naturally.
   */
  const relative = (date: Date, locale: string): string => {
    const diff = date.getTime() - Date.now()
    const abs = Math.abs(diff)
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
    const sign = diff < 0 ? -1 : 1
    if (abs < 60_000) return rtf.format(sign * Math.round(abs / 1000), 'second')
    if (abs < 3_600_000) return rtf.format(sign * Math.round(abs / 60_000), 'minute')
    if (abs < 86_400_000) return rtf.format(sign * Math.round(abs / 3_600_000), 'hour')
    if (abs < 2_592_000_000) return rtf.format(sign * Math.round(abs / 86_400_000), 'day')
    if (abs < 31_536_000_000) return rtf.format(sign * Math.round(abs / 2_592_000_000), 'month')
    return rtf.format(sign * Math.round(abs / 31_536_000_000), 'year')
  }

  /** Localised long-form weekday name (e.g. "Tuesday", "martes"). */
  const weekdayName = (date: Date, locale: string): string =>
    new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(date)

  /** Render the browser's current timezone offset as `UTC±HH:MM`. */
  const tzLabel = (date: Date): string => {
    const offsetMin = -date.getTimezoneOffset()
    const sign = offsetMin >= 0 ? '+' : '-'
    const abs = Math.abs(offsetMin)
    return `UTC${sign}${pad2(Math.floor(abs / 60))}:${pad2(abs % 60)}`
  }

  return { format, parse, detect, relative, weekdayName, tzLabel }
}
