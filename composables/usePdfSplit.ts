import { PDFDocument } from 'pdf-lib'

export interface ParseResult {
  pages: number[]
  invalidTokens: string[]
  outOfRange: string[]
}

export const usePdfSplit = () => {
  const parseRanges = (input: string, totalPages: number): ParseResult => {
    const pages = new Set<number>()
    const invalidTokens: string[] = []
    const outOfRange: string[] = []

    const tokens = input
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

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

  const extractPages = async (
    data: ArrayBuffer,
    pageNumbers: number[],
  ): Promise<Uint8Array> => {
    if (pageNumbers.length === 0) throw new Error('NO_PAGES')

    const src = await PDFDocument.load(data, { ignoreEncryption: true })
    if (src.isEncrypted) throw new Error('ENCRYPTED')

    const out = await PDFDocument.create()
    const indices = pageNumbers.map((n) => n - 1)
    const copied = await out.copyPages(src, indices)
    copied.forEach((p) => out.addPage(p))
    return await out.save()
  }

  const countPages = async (data: ArrayBuffer): Promise<number> => {
    try {
      const doc = await PDFDocument.load(data, { ignoreEncryption: true })
      return doc.getPageCount()
    } catch {
      return 0
    }
  }

  return { parseRanges, extractPages, countPages }
}
