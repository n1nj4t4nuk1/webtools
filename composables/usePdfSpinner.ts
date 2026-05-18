/**
 * usePdfSpinner
 *
 * Composable powering the PdfSpinner tool: rotates selected pages of a
 * PDF by a fixed angle. Rotations are *additive* relative to the page's
 * current orientation, so applying 90° twice yields 180°.
 *
 * Also exposes a shared range parser that turns user input like
 * `1-3, 5, 7-10` into a sorted, deduplicated page-number list, classifying
 * unparseable tokens for the UI to display as warnings.
 */
import { PDFDocument, degrees } from 'pdf-lib'

/** Quarter-turn angles. pdf-lib also accepts arbitrary degrees but the
 *  UI restricts the user to these three.
 */
export type RotationAngle = 90 | 180 | 270

/** Output of {@link usePdfSpinner.parseRanges}. */
export interface ParseResult {
  /** Pages selected by the user (1-based, sorted, deduplicated). */
  pages: number[]
  /** Tokens that don't look like a number or range (e.g. "abc"). */
  invalidTokens: string[]
  /** Tokens whose numeric values fall outside `1..totalPages`. */
  outOfRange: string[]
}

/** Wrap any rotation value into the `[0, 360)` interval. */
const normalize = (n: number): number => ((n % 360) + 360) % 360

export const usePdfSpinner = () => {
  /**
   * Parse a comma/whitespace separated list of page numbers and
   * ranges (`1-3`). Empty input is treated as "all pages". Invalid
   * tokens are silently skipped but reported back so the UI can
   * surface a warning.
   */
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

  /**
   * Apply `angle` (added to whatever rotation the page already has) to
   * every entry in `pageNumbers` (1-based). Pages outside the document
   * are silently skipped. Throws `NO_PAGES` for an empty input or
   * `ENCRYPTED` for password-protected PDFs.
   */
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

  /** Read a PDF's page count, returning 0 if the file fails to parse. */
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
