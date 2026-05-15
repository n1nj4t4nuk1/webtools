export interface PasswordOptions {
  length: number
  uppercase: boolean
  lowercase: boolean
  numbers: boolean
  symbols: boolean
  excludeSimilar: boolean
  excludeAmbiguous: boolean
}

export type StrengthBucket =
  | 'veryWeak'
  | 'weak'
  | 'reasonable'
  | 'strong'
  | 'veryStrong'

const SIMILAR = /[lI1O0o]/g
const AMBIGUOUS = /[{}[\]()/\\'"`~,;:.<>]/g

const BASE_UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const BASE_LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const BASE_NUMBERS = '0123456789'
const BASE_SYMBOLS = '!@#$%^&*()-_=+[]{}<>?/|~,.;:'

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

// Unbiased random integer in [0, max) using rejection sampling.
const randomInt = (max: number): number => {
  if (max <= 0) throw new Error('max must be > 0')
  const buf = new Uint32Array(1)
  const limit = Math.floor(0xffffffff / max) * max
  while (true) {
    crypto.getRandomValues(buf)
    if (buf[0] < limit) return buf[0] % max
  }
}

const pickFrom = (chars: string): string => chars[randomInt(chars.length)]

const shuffle = <T>(arr: T[]): T[] => {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export const usePasswordGenerator = () => {
  const generate = (opts: PasswordOptions): string => {
    const sets = buildCharset(opts)
    if (sets.length === 0) throw new Error('no-charset')
    if (opts.length < sets.length) {
      // Need at least one char from each active set; bump length silently.
      opts = { ...opts, length: sets.length }
    }
    const all = sets.join('')
    const chars: string[] = []
    // Guarantee one char from each active set.
    for (const set of sets) chars.push(pickFrom(set))
    // Fill the rest from the union.
    while (chars.length < opts.length) chars.push(pickFrom(all))
    return shuffle(chars).join('')
  }

  const entropyBits = (opts: PasswordOptions): number => {
    const sets = buildCharset(opts)
    if (sets.length === 0) return 0
    const alphabetSize = sets.join('').length
    if (alphabetSize <= 1) return 0
    return Math.round(opts.length * Math.log2(alphabetSize))
  }

  const strength = (bits: number): StrengthBucket => {
    if (bits < 28) return 'veryWeak'
    if (bits < 36) return 'weak'
    if (bits < 60) return 'reasonable'
    if (bits < 128) return 'strong'
    return 'veryStrong'
  }

  return { generate, entropyBits, strength }
}
