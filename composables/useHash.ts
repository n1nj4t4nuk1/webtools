export type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

export const ALL_ALGORITHMS: HashAlgorithm[] = [
  'SHA-1',
  'SHA-256',
  'SHA-384',
  'SHA-512',
]

const bufferToHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

export const useHash = () => {
  const hashBuffer = async (
    algo: HashAlgorithm,
    buffer: ArrayBuffer,
  ): Promise<string> => {
    const digest = await crypto.subtle.digest(algo, buffer)
    return bufferToHex(digest)
  }

  const hashText = async (
    algo: HashAlgorithm,
    text: string,
  ): Promise<string> => {
    const encoded = new TextEncoder().encode(text)
    return hashBuffer(algo, encoded.buffer as ArrayBuffer)
  }

  const hashFile = async (
    algo: HashAlgorithm,
    file: File,
  ): Promise<string> => {
    const buffer = await file.arrayBuffer()
    return hashBuffer(algo, buffer)
  }

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
