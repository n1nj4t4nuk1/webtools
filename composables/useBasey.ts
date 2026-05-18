/**
 * useBasey
 *
 * Composable powering the Basey tool: converts an integer between
 * arbitrary numeric bases (2..36) using JavaScript's native `BigInt`, so
 * inputs of any size are supported (no IEEE 754 precision loss).
 *
 * The built-in bases shown in the UI are binary, octal, decimal and
 * hexadecimal, but the parsing/stringification helpers accept any radix
 * in `[2, 36]`.
 */

/** Description of a numeric base displayed by the UI. */
export interface BaseSpec {
  id: string
  radix: number
  builtin: boolean
}

/** Bases pre-populated in the UI. */
export const DEFAULT_BASES: BaseSpec[] = [
  { id: 'bin', radix: 2, builtin: true },
  { id: 'oct', radix: 8, builtin: true },
  { id: 'dec', radix: 10, builtin: true },
  { id: 'hex', radix: 16, builtin: true },
]

/** Digit alphabet for bases up to 36 (0-9 followed by a-z). */
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

/**
 * Return true if `raw` is a valid representation of an integer in
 * `radix`. An optional leading minus sign is allowed.
 */
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

/**
 * Parse `raw` as an integer in `radix`. Returns `null` if the string
 * contains digits outside the alphabet for the given base.
 */
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

/** Stringify a BigInt in the requested radix, preserving the minus sign. */
const stringify = (value: bigint, radix: number): string => {
  if (value < 0n) return `-${(-value).toString(radix)}`
  return value.toString(radix)
}

export const useBasey = () => {
  /**
   * Parse `raw` once in `fromRadix` and emit a string for each base in
   * `targetRadixes`. If the input is invalid, returns empty strings for
   * every target base and `valid: false`, so the UI can clear all fields
   * but keep showing the invalid input.
   */
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
