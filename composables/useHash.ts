/**
 * useHash
 *
 * Composable powering the Hashy tool: SHA-1/256/384/512 digests for
 * text or files using Web Crypto (`crypto.subtle.digest`). Everything
 * runs entirely in the browser; the file is read with
 * `File.arrayBuffer()` and hashed in one shot.
 *
 * Also exposes `hexLengthToAlgorithm` so the verification UI can guess
 * which algorithm produced a user-pasted hash from its length alone.
 */

/** Algorithms accepted by `crypto.subtle.digest`. */
export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

/** All algorithms, in display order. */
export const ALL_ALGORITHMS: HashAlgorithm[] = [
  'SHA-1',
  'SHA-256',
  'SHA-384',
  'SHA-512',
]

/** Lowercase hex representation of a digest buffer. */
const bufferToHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

export const useHash = () => {
  /** Hash an arbitrary buffer with the requested algorithm. */
  const hashBuffer = async (
    algo: HashAlgorithm,
    buffer: ArrayBuffer,
  ): Promise<string> => {
    const digest = await crypto.subtle.digest(algo, buffer)
    return bufferToHex(digest)
  }

  /** Hash a UTF-8 encoded text string. */
  const hashText = async (
    algo: HashAlgorithm,
    text: string,
  ): Promise<string> => {
    const encoded = new TextEncoder().encode(text)
    return hashBuffer(algo, encoded.buffer as ArrayBuffer)
  }

  /** Hash a file's full contents (read into memory in one go). */
  const hashFile = async (
    algo: HashAlgorithm,
    file: File,
  ): Promise<string> => {
    const buffer = await file.arrayBuffer()
    return hashBuffer(algo, buffer)
  }

  /** Compute every algorithm's digest of a text in parallel. */
  const hashAllText = async (
    text: string,
  ): Promise<Record<HashAlgorithm, string>> => {
    const encoded = new TextEncoder().encode(text)
    const buffer = encoded.buffer as ArrayBuffer
    const results = await Promise.all(
      ALL_ALGORITHMS.map((algo) => hashBuffer(algo, buffer)),
    )
    return Object.fromEntries(
      ALL_ALGORITHMS.map((algo, i) => [algo, results[i]]),
    ) as Record<HashAlgorithm, string>
  }

  /** Compute every algorithm's digest of a file in parallel. */
  const hashAllFile = async (
    file: File,
  ): Promise<Record<HashAlgorithm, string>> => {
    const buffer = await file.arrayBuffer()
    const results = await Promise.all(
      ALL_ALGORITHMS.map((algo) => hashBuffer(algo, buffer)),
    )
    return Object.fromEntries(
      ALL_ALGORITHMS.map((algo, i) => [algo, results[i]]),
    ) as Record<HashAlgorithm, string>
  }

  /**
   * Map a hex digest's character length to the algorithm that most
   * likely produced it (40 → SHA-1, 64 → SHA-256, etc.). Returns `null`
   * for unrecognized lengths so the verification UI can flag it.
   */
  const hexLengthToAlgorithm = (hexLen: number): HashAlgorithm | null => {
    switch (hexLen) {
      case 40:
        return 'SHA-1'
      case 64:
        return 'SHA-256'
      case 96:
        return 'SHA-384'
      case 128:
        return 'SHA-512'
      default:
        return null
    }
  }

  return {
    hashText,
    hashFile,
    hashAllText,
    hashAllFile,
    hexLengthToAlgorithm,
  }
}
