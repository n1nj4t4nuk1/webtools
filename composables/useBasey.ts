export interface BaseSpec {
  id: string
  radix: number
  builtin: boolean
}

export const DEFAULT_BASES: BaseSpec[] = [
  { id: 'bin', radix: 2, builtin: true },
  { id: 'oct', radix: 8, builtin: true },
  { id: 'dec', radix: 10, builtin: true },
  { id: 'hex', radix: 16, builtin: true },
]

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

const isValid = (raw: string, radix: number): boolean => {
  const trimmed = raw.trim()
  if (trimmed.length === 0) return false
  const body = trimmed.startsWith('-') ? trimmed.slice(1) : trimmed
  if (body.length === 0) return false
  for (const ch of body.toLowerCase()) {
    const idx = DIGITS.indexOf(ch)
    if (idx === -1 || idx >= radix) return false
  }
  return true
}

const parse = (raw: string, radix: number): bigint | null => {
  const trimmed = raw.trim()
  if (!isValid(trimmed, radix)) return null
  const negative = trimmed.startsWith('-')
  const body = negative ? trimmed.slice(1) : trimmed
  let value = 0n
  const r = BigInt(radix)
  for (const ch of body.toLowerCase()) {
    value = value * r + BigInt(DIGITS.indexOf(ch))
  }
  return negative ? -value : value
}

const stringify = (value: bigint, radix: number): string => {
  if (value < 0n) return `-${(-value).toString(radix)}`
  return value.toString(radix)
}

export const useBasey = () => {
  const convertAll = (
    raw: string,
    fromRadix: number,
    targetRadixes: number[],
  ): { values: string[]; valid: boolean } => {
    const value = parse(raw, fromRadix)
    if (value === null) {
      return { values: targetRadixes.map(() => ''), valid: false }
    }
    return {
      values: targetRadixes.map((r) => stringify(value, r)),
      valid: true,
    }
  }

  return { parse, stringify, isValid, convertAll }
}
