import { PDFDocument, degrees } from 'pdf-lib'

export type RotationAngle = 90 | 180 | 270

export interface ParseResult {
  pages: number[]
  invalidTokens: string[]
  outOfRange: string[]
}

const normalize = (n: number): number => ((n % 360) + 360) % 360

export const usePdfSpinner = () => {
  const parseRanges = (input: string, totalPages: number): ParseResult => {
    const pages = new Set<number>()
    const invalidTokens: string[] = []
    const outOfRange: string[] = []

    const trimmed = input.trim()
    if (trimmed.length === 0) {
      for (let i = 1; i <= totalPages; i++) pages.add(i)
      return { pages: [...pages].sort((a, b) => a - b), invalidTokens, outOfRange }
    }

    const tokens = trimmed.split(/[,\s]+/).filter((t) => t.length > 0)

    for (const token of tokens) {
      const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/)
      const singleMatch = token.match(/^(\d+)$/)

      if (rangeMatch) {
        let from = Number(rangeMatch[1])
        let to = Number(rangeMatch[2])
        if (from > to) [from, to] = [to, from]
        if (from < 1 || to > totalPages) {
          outOfRange.push(token)
          continue
        }
        for (let i = from; i <= to; i++) pages.add(i)
      } else if (singleMatch) {
        const n = Number(singleMatch[1])
        if (n < 1 || n > totalPages) {
          outOfRange.push(token)
          continue
        }
        pages.add(n)
      } else {
        invalidTokens.push(token)
      }
    }

    return {
      pages: [...pages].sort((a, b) => a - b),
      invalidTokens,
      outOfRange,
    }
  }

  const rotatePages = async (
    data: ArrayBuffer,
    pageNumbers: number[],
    angle: RotationAngle,
  ): Promise<Uint8Array> => {
    if (pageNumbers.length === 0) throw new Error('NO_PAGES')

    const doc = await PDFDocument.load(data, { ignoreEncryption: true })
    if (doc.isEncrypted) throw new Error('ENCRYPTED')

    const pages = doc.getPages()
    for (const n of pageNumbers) {
      const page = pages[n - 1]
      if (!page) continue
      const current = page.getRotation().angle
      page.setRotation(degrees(normalize(current + angle)))
    }
    return await doc.save()
  }

  const countPages = async (data: ArrayBuffer): Promise<number> => {
    try {
      const doc = await PDFDocument.load(data, { ignoreEncryption: true })
      return doc.getPageCount()
    } catch {
      return 0
    }
  }

  return { parseRanges, rotatePages, countPages }
}
