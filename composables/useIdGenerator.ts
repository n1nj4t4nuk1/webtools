export type IdFormat = 'uuidv4' | 'uuidv7' | 'uuidNil' | 'ulid' | 'nanoid'

export const ALL_FORMATS: IdFormat[] = [
  'uuidv4',
  'uuidv7',
  'uuidNil',
  'ulid',
  'nanoid',
]

const HEX = '0123456789abcdef'
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const NANOID_ALPHABET =
  'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict'

const bytesToUuidString = (bytes: Uint8Array): string => {
  let out = ''
  for (let i = 0; i < 16; i++) {
    out += HEX[bytes[i] >> 4] + HEX[bytes[i] & 0x0f]
    if (i === 3 || i === 5 || i === 7 || i === 9) out += '-'
  }
  return out
}

const generateUuidV4 = (): string => {
  // Web Crypto in modern browsers. Fallback for older Safari with manual generation.
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // RFC 4122 variant
  return bytesToUuidString(bytes)
}

const generateUuidV7 = (): string => {
  const ts = Date.now()
  const rand = new Uint8Array(10)
  crypto.getRandomValues(rand)

  const bytes = new Uint8Array(16)
  // 48-bit big-endian timestamp (ms since Unix epoch)
  bytes[0] = Math.floor(ts / 0x10000000000) & 0xff
  bytes[1] = Math.floor(ts / 0x100000000) & 0xff
  bytes[2] = Math.floor(ts / 0x1000000) & 0xff
  bytes[3] = Math.floor(ts / 0x10000) & 0xff
  bytes[4] = Math.floor(ts / 0x100) & 0xff
  bytes[5] = ts & 0xff
  // version (7) in high nibble of byte 6 + 4 bits rand_a
  bytes[6] = 0x70 | (rand[0] & 0x0f)
  bytes[7] = rand[1]
  // RFC 4122 variant in high 2 bits of byte 8 + 6 bits rand_b
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

const UUID_NIL = '00000000-0000-0000-0000-000000000000'

const generateUlid = (): string => {
  let ts = Date.now()
  // 48-bit timestamp encoded as 10 chars in Crockford Base32
  const tsChars: string[] = new Array(10)
  for (let i = 9; i >= 0; i--) {
    tsChars[i] = CROCKFORD[ts & 31]
    ts = Math.floor(ts / 32)
  }
  // 80-bit random encoded as 16 chars
  const rand = new Uint8Array(16)
  crypto.getRandomValues(rand)
  let randStr = ''
  for (let i = 0; i < 16; i++) randStr += CROCKFORD[rand[i] & 31]
  return tsChars.join('') + randStr
}

const generateNanoId = (size = 21): string => {
  const bytes = new Uint8Array(size)
  crypto.getRandomValues(bytes)
  let id = ''
  for (let i = 0; i < size; i++) id += NANOID_ALPHABET[bytes[i] & 63]
  return id
}

export const useIdGenerator = () => {
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

  const generateMany = (
    format: IdFormat,
    count: number,
    opts?: { nanoidSize?: number },
  ): string[] => {
    const out: string[] = []
    for (let i = 0; i < count; i++) out.push(generate(format, opts))
    return out
  }

  const transform = (id: string, opts: { uppercase: boolean; hyphens: boolean }) => {
    let out = id
    if (!opts.hyphens) out = out.replace(/-/g, '')
    out = opts.uppercase ? out.toUpperCase() : out.toLowerCase()
    // ULID is canonical uppercase, leave as-is unless explicitly downcased
    return out
  }

  return { generate, generateMany, transform }
}
