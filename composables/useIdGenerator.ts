/**
 * useIdGenerator
 *
 * Composable powering the Idkun tool: cryptographically-secure
 * generation of UUID v4, UUID v7, the all-zero NIL UUID, ULID and
 * NanoID. All randomness comes from `crypto.getRandomValues` (or the
 * native `crypto.randomUUID` when available for v4).
 *
 * Implementations are intentionally inline (no library) so the tool
 * stays small and the spec layout is visible at a glance.
 */

/** ID formats supported by the generator. */
export type IdFormat = 'uuidv4' | 'uuidv7' | 'uuidNil' | 'ulid' | 'nanoid'

/** All formats, in display order. */
export const ALL_FORMATS: IdFormat[] = [
  'uuidv4',
  'uuidv7',
  'uuidNil',
  'ulid',
  'nanoid',
]

/** Lowercase hex alphabet used to render UUIDs. */
const HEX = '0123456789abcdef'
/** Crockford Base32 alphabet used by ULID. */
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
/** Standard NanoID alphabet (URL-safe, 64 chars). */
const NANOID_ALPHABET =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'

/** Render the 16-byte UUID buffer with the canonical 8-4-4-4-12 dashes. */
const bytesToUuidString = (bytes: Uint8Array): string => {
  let out = ''
  for (let i = 0; i < 16; i++) {
    out += HEX[bytes[i] >> 4] + HEX[bytes[i] & 0x0f]
    if (i === 3 || i === 5 || i === 7 || i === 9) out += '-'
  }
  return out
}

/**
 * RFC 4122 v4 UUID. Uses `crypto.randomUUID` when available; otherwise
 * generates 16 random bytes and sets the version/variant bits by hand.
 */
const generateUuidV4 = (): string => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // RFC 4122 variant
  return bytesToUuidString(bytes)
}

/**
 * UUID v7 (time-ordered): the first 48 bits are the current Unix time
 * in milliseconds (big-endian), followed by version/variant bits and
 * 74 bits of randomness. Sorts naturally in chronological order.
 */
const generateUuidV7 = (): string => {
  const ts = Date.now()
  const rand = new Uint8Array(10)
  crypto.getRandomValues(rand)

  const bytes = new Uint8Array(16)
  // 48-bit big-endian timestamp (ms since Unix epoch).
  bytes[0] = Math.floor(ts / 0x10000000000) & 0xff
  bytes[1] = Math.floor(ts / 0x100000000) & 0xff
  bytes[2] = Math.floor(ts / 0x1000000) & 0xff
  bytes[3] = Math.floor(ts / 0x10000) & 0xff
  bytes[4] = Math.floor(ts / 0x100) & 0xff
  bytes[5] = ts & 0xff
  // Version (7) in high nibble of byte 6 + 4 bits rand_a.
  bytes[6] = 0x70 | (rand[0] & 0x0f)
  bytes[7] = rand[1]
  // RFC 4122 variant in high 2 bits of byte 8 + 6 bits rand_b.
  bytes[8] = 0x80 | (rand[2] & 0x3f)
  bytes[9] = rand[3]
  bytes[10] = rand[4]
  bytes[11] = rand[5]
  bytes[12] = rand[6]
  bytes[13] = rand[7]
  bytes[14] = rand[8]
  bytes[15] = rand[9]

  return bytesToUuidString(bytes)
}

/** The canonical NIL UUID (all zeros). */
const UUID_NIL = '00000000-0000-0000-0000-000000000000'

/**
 * ULID: 48-bit timestamp + 80 bits of randomness, both encoded in
 * Crockford Base32 (10 + 16 = 26 characters total). Result is uppercase.
 */
const generateUlid = (): string => {
  let ts = Date.now()
  // 48-bit timestamp encoded as 10 chars in Crockford Base32.
  const tsChars: string[] = new Array(10)
  for (let i = 9; i >= 0; i--) {
    tsChars[i] = CROCKFORD[ts & 31]
    ts = Math.floor(ts / 32)
  }
  // 80-bit random encoded as 16 chars.
  const rand = new Uint8Array(16)
  crypto.getRandomValues(rand)
  let randStr = ''
  for (let i = 0; i < 16; i++) randStr += CROCKFORD[rand[i] & 31]
  return tsChars.join('') + randStr
}

/**
 * NanoID: `size` random characters picked from the standard 64-char
 * alphabet. Uses 6 bits per byte (`& 63`), accepting the tiny bias for
 * simplicity since the alphabet length is a power of two.
 */
const generateNanoId = (size = 21): string => {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  let id = ''
  for (let i = 0; i < size; i++) id += NANOID_ALPHABET[bytes[i] & 63]
  return id
}

export const useIdGenerator = () => {
  /** Generate a single identifier in the requested format. */
  const generate = (format: IdFormat, opts?: { nanoidSize?: number }): string => {
    switch (format) {
      case 'uuidv4':
        return generateUuidV4()
      case 'uuidv7':
        return generateUuidV7()
      case 'uuidNil':
        return UUID_NIL
      case 'ulid':
        return generateUlid()
      case 'nanoid':
        return generateNanoId(opts?.nanoidSize ?? 21)
    }
  }

  /** Generate `count` independent identifiers. */
  const generateMany = (
    format: IdFormat,
    count: number,
    opts?: { nanoidSize?: number },
  ): string[] => {
    const out: string[] = []
    for (let i = 0; i < count; i++) out.push(generate(format, opts))
    return out
  }

  /**
   * Apply display transforms (case + hyphen removal). ULID is canonically
   * uppercase so it's left alone unless the caller explicitly downcases.
   */
  const transform = (id: string, opts: { uppercase: boolean; hyphens: boolean }) => {
    let out = id
    if (!opts.hyphens) out = out.replace(/-/g, '')
    out = opts.uppercase ? out.toUpperCase() : out.toLowerCase()
    return out
  }

  return { generate, generateMany, transform }
}
