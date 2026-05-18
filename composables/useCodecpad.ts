/**
 * useCodecpad
 *
 * Composable powering the Codecpad tool: a bidirectional codec hub that
 * lets the user edit text in any of UTF-8, Base64, Base64 URL-safe,
 * Base32, Hex or Base58 and instantly see the same payload re-encoded in
 * every other format.
 *
 * Internally every codec operates on `Uint8Array`, so the conversion flow
 * is always `text → bytes (decode) → text (encode)`. UTF-8 is treated
 * uniformly: its "decode" is `TextEncoder.encode` and its "encode" is
 * `TextDecoder.decode` with strict mode (returns `null` on invalid UTF-8).
 *
 * All encoders are self-contained — no external dependencies — so they
 * stay tiny and offline-friendly.
 */

/** Identifier for each supported codec. */
export type CodecId = 'utf8' | 'base64' | 'base64url' | 'base32' | 'hex' | 'base58'

/** Every codec the component knows about. */
export const ALL_CODECS: CodecId[] = [
  'utf8',
  'base64',
  'base64url',
  'base32',
  'hex',
  'base58',
]

/** Codecs visible by default when the page loads. */
export const DEFAULT_ACTIVE: CodecId[] = ['utf8', 'base64', 'hex']

/** RFC 4648 Base32 alphabet (no padding stripping at encode time). */
const BASE32_ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
/** Bitcoin-style Base58 alphabet (no `0`, `O`, `I`, `l` to avoid confusion). */
const BASE58_ALPHA = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/** Decode bytes as UTF-8 text, returning null if the byte sequence is invalid. */
const utf8Encode = (bytes: Uint8Array): string | null => {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}
/** Encode a text string as a UTF-8 byte sequence. */
const utf8Decode = (text: string): Uint8Array => new TextEncoder().encode(text)

/** Standard Base64 encoder using the browser's `btoa`. */
const base64Encode = (bytes: Uint8Array): string => {
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}
/** Strict Base64 decoder: returns null on any character outside `A-Za-z0-9+/=`. */
const base64Decode = (text: string): Uint8Array | null => {
  const cleaned = text.trim().replace(/\s+/g, '')
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) return null
  try {
    const bin = atob(cleaned)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

/** URL-safe Base64 (replaces `+/` with `-_` and strips padding). */
const base64UrlEncode = (bytes: Uint8Array): string =>
  base64Encode(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
/** URL-safe Base64 decoder; re-adds the required padding before delegating. */
const base64UrlDecode = (text: string): Uint8Array | null => {
  const cleaned = text.trim().replace(/\s+/g, '')
  if (!/^[A-Za-z0-9_-]*={0,2}$/.test(cleaned)) return null
  const restored = cleaned.replace(/-/g, '+').replace(/_/g, '/')
  const pad = (4 - (restored.length % 4)) % 4
  return base64Decode(restored + '='.repeat(pad))
}

/** Lowercase hex encoder, two characters per byte. */
const hexEncode = (bytes: Uint8Array): string => {
  let out = ''
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0')
  return out
}
/** Hex decoder; requires an even number of `0-9a-f` characters. */
const hexDecode = (text: string): Uint8Array | null => {
  const cleaned = text.trim().replace(/\s+/g, '').toLowerCase()
  if (cleaned.length === 0) return new Uint8Array(0)
  if (!/^[0-9a-f]*$/.test(cleaned) || cleaned.length % 2 !== 0) return null
  const bytes = new Uint8Array(cleaned.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleaned.substr(i * 2, 2), 16)
  }
  return bytes
}

/** Base32 encoder. Pads the output to a multiple of 8 chars with `=`. */
const base32Encode = (bytes: Uint8Array): string => {
  let bits = 0
  let value = 0
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    value = (value << 8) | bytes[i]
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHA[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32_ALPHA[(value << (5 - bits)) & 31]
  while (out.length % 8 !== 0) out += '='
  return out
}
/** Base32 decoder. Strips padding and is case-insensitive. */
const base32Decode = (text: string): Uint8Array | null => {
  const cleaned = text.trim().toUpperCase().replace(/=+$/, '').replace(/\s+/g, '')
  if (!/^[A-Z2-7]*$/.test(cleaned)) return null
  if (cleaned.length === 0) return new Uint8Array(0)
  const result: number[] = []
  let bits = 0
  let value = 0
  for (const ch of cleaned) {
    const idx = BASE32_ALPHA.indexOf(ch)
    if (idx < 0) return null
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      result.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(result)
}

/**
 * Base58 encoder (Bitcoin variant). Leading zero bytes become leading
 * '1' characters per the standard convention; the rest of the bytes are
 * treated as a single big-endian integer and converted base by base.
 */
const base58Encode = (bytes: Uint8Array): string => {
  if (bytes.length === 0) return ''
  let zeros = 0
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++
  let num = 0n
  for (let i = 0; i < bytes.length; i++) num = num * 256n + BigInt(bytes[i])
  let out = ''
  while (num > 0n) {
    out = BASE58_ALPHA[Number(num % 58n)] + out
    num = num / 58n
  }
  return '1'.repeat(zeros) + out
}
/** Base58 decoder. Mirror of {@link base58Encode}. */
const base58Decode = (text: string): Uint8Array | null => {
  const cleaned = text.trim().replace(/\s+/g, '')
  if (cleaned.length === 0) return new Uint8Array(0)
  let zeros = 0
  while (zeros < cleaned.length && cleaned[zeros] === '1') zeros++
  let num = 0n
  for (const ch of cleaned) {
    const idx = BASE58_ALPHA.indexOf(ch)
    if (idx < 0) return null
    num = num * 58n + BigInt(idx)
  }
  const rest: number[] = []
  while (num > 0n) {
    rest.unshift(Number(num % 256n))
    num = num / 256n
  }
  const bytes = new Uint8Array(zeros + rest.length)
  for (let i = 0; i < rest.length; i++) bytes[zeros + i] = rest[i]
  return bytes
}

/** A symmetric codec — encoding produces text, decoding produces bytes. */
interface Codec {
  encode: (bytes: Uint8Array) => string | null
  decode: (text: string) => Uint8Array | null
}

/** Dispatch table indexed by `CodecId`. */
const CODECS: Record<CodecId, Codec> = {
  utf8: { encode: utf8Encode, decode: utf8Decode },
  base64: { encode: base64Encode, decode: base64Decode },
  base64url: { encode: base64UrlEncode, decode: base64UrlDecode },
  base32: { encode: base32Encode, decode: base32Decode },
  hex: { encode: hexEncode, decode: hexDecode },
  base58: { encode: base58Encode, decode: base58Decode },
}

export const useCodecpad = () => {
  /** Parse `text` according to `codec`, returning the bytes it represents. */
  const toBytes = (text: string, codec: CodecId): Uint8Array | null =>
    CODECS[codec].decode(text)

  /** Render `bytes` as a string in the given `codec`. */
  const fromBytes = (bytes: Uint8Array, codec: CodecId): string | null =>
    CODECS[codec].encode(bytes)

  return { toBytes, fromBytes }
}
