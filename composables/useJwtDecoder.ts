export type JwtErrorCode =
  | 'EMPTY'
  | 'INVALID_FORMAT'
  | 'INVALID_HEADER'
  | 'INVALID_PAYLOAD'

export interface JwtResult {
  valid: boolean
  header: unknown
  payload: unknown
  signature: string
  error: JwtErrorCode | null
}

const base64UrlDecode = (str: string): string | null => {
  const cleaned = str.trim().replace(/\s+/g, '')
  if (!/^[A-Za-z0-9_-]*$/.test(cleaned)) return null
  const restored = cleaned.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (restored.length % 4)) % 4
  try {
    const bin = atob(restored + '='.repeat(pad))
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

const parsePart = (part: string): unknown | null => {
  const text = base64UrlDecode(part)
  if (text === null) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const STANDARD_CLAIMS = ['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti']
const TIME_CLAIMS = new Set(['exp', 'nbf', 'iat'])

export const useJwtDecoder = () => {
  const parse = (token: string): JwtResult => {
    const trimmed = token.trim()
    if (trimmed.length === 0) {
      return { valid: false, header: null, payload: null, signature: '', error: 'EMPTY' }
    }
    const parts = trimmed.split('.')
    if (parts.length !== 3) {
      return { valid: false, header: null, payload: null, signature: '', error: 'INVALID_FORMAT' }
    }
    const header = parsePart(parts[0])
    if (header === null) {
      return { valid: false, header: null, payload: null, signature: '', error: 'INVALID_HEADER' }
    }
    const payload = parsePart(parts[1])
    if (payload === null) {
      return { valid: false, header, payload: null, signature: parts[2], error: 'INVALID_PAYLOAD' }
    }
    return { valid: true, header, payload, signature: parts[2], error: null }
  }

  const isTimeClaim = (key: string): boolean => TIME_CLAIMS.has(key)

  const formatTimestamp = (value: unknown, locale: string): string => {
    if (typeof value !== 'number') return String(value)
    const ms = value * 1000
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'medium',
    }).format(new Date(ms))
  }

  const relativeTime = (value: unknown, locale: string): string | null => {
    if (typeof value !== 'number') return null
    const ms = value * 1000
    const diff = ms - Date.now()
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

  const tokenStatus = (
    payload: unknown,
  ): 'valid' | 'expired' | 'notYet' | 'unknown' => {
    if (!payload || typeof payload !== 'object') return 'unknown'
    const p = payload as Record<string, unknown>
    const now = Date.now() / 1000
    const exp = typeof p.exp === 'number' ? p.exp : null
    const nbf = typeof p.nbf === 'number' ? p.nbf : null
    if (exp !== null && now > exp) return 'expired'
    if (nbf !== null && now < nbf) return 'notYet'
    if (exp !== null) return 'valid'
    return 'unknown'
  }

  return { parse, isTimeClaim, formatTimestamp, relativeTime, tokenStatus }
}
