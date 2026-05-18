/**
 * usePasswordGenerator
 *
 * Composable powering the Createpass tool: generates strong, random
 * passwords using `crypto.getRandomValues` (no `Math.random`). Each
 * active character set contributes at least one character to the
 * output, then the rest is filled from the union of all active sets and
 * the result is Fisher-Yates shuffled to avoid revealing the
 * "one-per-set" prefix.
 *
 * Exposes an entropy estimator (bits ≈ length · log₂(alphabet)) and a
 * coarse strength bucket that maps to the UI's colored meter.
 */

/** Options forwarded to {@link usePasswordGenerator.generate}. */
export interface PasswordOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  /** Drop visually similar characters (l, I, 1, O, 0, o). */
  excludeSimilar: boolean
  /** Drop symbols that are ambiguous in quoted strings / CLIs. */
  excludeAmbiguous: boolean
}

/** Strength bucket returned by {@link usePasswordGenerator.strength}. */
export type StrengthBucket =
  | 'veryWeak'
  | 'weak'
  | 'reasonable'
  | 'strong'
  | 'veryStrong'

/** Characters that look alike in many fonts. */
const SIMILAR = /[lI1O0o]/g
/** Symbols that often need quoting or escaping in CLIs / code. */
const AMBIGUOUS = /[{}[\]()/\\'"`~,;:.<>]/g

const BASE_UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const BASE_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const BASE_NUMBERS = '0123456789'
const BASE_SYMBOLS = '!@#$%^&*()-_=+[]{}<>?/|~,.;:'

/**
 * Pick the active character sets, apply the exclusions, and drop any
 * set that ended up empty (so the caller doesn't have to special-case).
 */
const buildCharset = (opts: PasswordOptions): string[] => {
  const sets: string[] = []
  if (opts.uppercase) sets.push(BASE_UPPERCASE)
  if (opts.lowercase) sets.push(BASE_LOWERCASE)
  if (opts.numbers) sets.push(BASE_NUMBERS)
  if (opts.symbols) sets.push(BASE_SYMBOLS)
  return sets.map((set) => {
    let s = set
    if (opts.excludeSimilar) s = s.replace(SIMILAR, '')
    if (opts.excludeAmbiguous) s = s.replace(AMBIGUOUS, '')
    return s
  }).filter((s) => s.length > 0)
}

/**
 * Unbiased random integer in `[0, max)` via rejection sampling on a
 * 32-bit window. Discards values in the "remainder zone" so the
 * modulus is uniform.
 */
const randomInt = (max: number): number => {
  if (max <= 0) throw new Error('max must be > 0')
  const buf = new Uint32Array(1)
  const limit = Math.floor(0xffffffff / max) * max
  while (true) {
    crypto.getRandomValues(buf)
    if (buf[0] < limit) return buf[0] % max
  }
}

/** Pick one character uniformly at random from `chars`. */
const pickFrom = (chars: string): string => chars[randomInt(chars.length)]

/** Fisher-Yates shuffle using {@link randomInt} for the index draws. */
const shuffle = <T>(arr: T[]): T[] => {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export const usePasswordGenerator = () => {
  /**
   * Build a password that contains at least one character from every
   * active set, padded out to `length` from the union, then shuffled.
   * Bumps `length` silently if it's smaller than the number of active
   * sets. Throws `no-charset` if every set was disabled or emptied.
   */
  const generate = (opts: PasswordOptions): string => {
    const sets = buildCharset(opts)
    if (sets.length === 0) throw new Error('no-charset')
    if (opts.length < sets.length) {
      opts = { ...opts, length: sets.length }
    }
    const all = sets.join('')
    const chars: string[] = []
    for (const set of sets) chars.push(pickFrom(set))
    while (chars.length < opts.length) chars.push(pickFrom(all))
    return shuffle(chars).join('')
  }

  /**
   * Estimate the password's entropy as `length * log₂(alphabet)`. The
   * estimate ignores the "at-least-one-per-set" constraint (which
   * lowers entropy in practice by a fraction of a bit).
   */
  const entropyBits = (opts: PasswordOptions): number => {
    const sets = buildCharset(opts)
    if (sets.length === 0) return 0
    const alphabetSize = sets.join('').length
    if (alphabetSize <= 1) return 0
    return Math.round(opts.length * Math.log2(alphabetSize))
  }

  /** Map an entropy count (bits) to a strength bucket for the UI meter. */
  const strength = (bits: number): StrengthBucket => {
    if (bits < 28) return 'veryWeak'
    if (bits < 36) return 'weak'
    if (bits < 60) return 'reasonable'
    if (bits < 128) return 'strong'
    return 'veryStrong'
  }

  return { generate, entropyBits, strength }
}
