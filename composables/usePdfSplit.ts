/**
 * usePdfSplit
 *
 * Composable powering the Scissor tool: extracts a subset of pages from
 * a PDF into a brand-new PDF. The page-range parser mirrors the one in
 * {@link usePdfSpinner} but doesn't default to "all pages" on empty
 * input — Scissor wants the user to explicitly choose a subset.
 */
import { PDFDocument } from 'pdf-lib'

/** Output of {@link usePdfSplit.parseRanges}. */
export interface ParseResult {
  /** Pages selected by the user (1-based, sorted, deduplicated). */
  pages: number[]
  /** Tokens that don't look like a number or range. */
  invalidTokens: string[]
  /** Tokens whose numeric values fall outside `1..totalPages`. */
  outOfRange: string[]
}

export const usePdfSplit = () => {
  /**
   * Parse a comma/whitespace separated list of page numbers and ranges
   * (`1-3`). Unlike {@link usePdfSpinner.parseRanges}, an empty input
   * yields *no* pages so the extraction button stays disabled until the
   * user types something explicit.
   */
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

  /**
   * Create a new PDF containing only the requested pages (1-based,
   * preserving the given order). Throws `NO_PAGES` for an empty list or
   * `ENCRYPTED` for password-protected sources.
   */
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

  /** Read a PDF's page count, returning 0 if the file fails to parse. */
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
