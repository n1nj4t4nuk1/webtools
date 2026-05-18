/**
 * usePdfMerge
 *
 * Composable powering the Stapler tool: concatenates several PDFs into
 * a single new PDF using `pdf-lib`. Pages are copied across in the
 * order the items are received.
 */
import { PDFDocument } from 'pdf-lib'

/** One file to include in the merge, with its raw bytes and original name. */
export interface PdfMergeItem {
  name: string
  data: ArrayBuffer
}

export const usePdfMerge = () => {
  /**
   * Merge the given items in order. Throws:
   *   - `NO_FILES` if no items are provided.
   *   - `INVALID_PDF:<name>` if `pdf-lib` can't parse a file.
   *   - `ENCRYPTED:<name>` if any file is password-protected.
   *
   * Embedding the failing file name in the error code lets the UI tell
   * the user *which* upload caused the problem.
   */
  const mergePdfs = async (items: PdfMergeItem[]): Promise<Uint8Array> => {
    if (items.length === 0) throw new Error('NO_FILES')

    const merged = await PDFDocument.create()

    for (const item of items) {
      let src: PDFDocument
      try {
        src = await PDFDocument.load(item.data, { ignoreEncryption: true })
      } catch {
        throw new Error(`INVALID_PDF:${item.name}`)
      }
      if (src.isEncrypted) {
        throw new Error(`ENCRYPTED:${item.name}`)
      }
      const pages = await merged.copyPages(src, src.getPageIndices())
      pages.forEach((p) => merged.addPage(p))
    }

    return await merged.save()
  }

  /** Read a PDF's page count without surfacing parsing errors. */
  const countPages = async (data: ArrayBuffer): Promise<number> => {
    try {
      const doc = await PDFDocument.load(data, { ignoreEncryption: true })
      return doc.getPageCount()
    } catch {
      return 0
    }
  }

  return { mergePdfs, countPages }
}
