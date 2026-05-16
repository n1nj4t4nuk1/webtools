import { PDFDocument } from 'pdf-lib'

export interface PdfMergeItem {
  name: string
  data: ArrayBuffer
}

export const usePdfMerge = () => {
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
