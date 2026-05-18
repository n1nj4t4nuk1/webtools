/**
 * useMetapdf
 *
 * Composable powering the Metapdf tool: reads and writes the metadata
 * stored in a PDF's document information dictionary (`/Info`) — title,
 * author, subject, keywords, producer, creator and the creation /
 * modification dates. Uses `pdf-lib`'s high-level getters and setters.
 *
 * Keywords are exposed as a single comma-separated string in the UI;
 * the composable splits/trims that string on write to match pdf-lib's
 * `string[]` argument.
 */
import { PDFDocument } from 'pdf-lib'

/** Editable PDF metadata fields. */
export interface PdfMeta {
  title: string
  author: string
  subject: string
  /** Comma-separated keywords; split on write. */
  keywords: string
  producer: string
  creator: string
  creationDate: Date | null
  modificationDate: Date | null
}

/** Metadata plus the read-only page count. */
export interface PdfFileInfo extends PdfMeta {
  pageCount: number
}

export const useMetapdf = () => {
  /**
   * Load the source PDF and return its current metadata and page count.
   * Throws `ENCRYPTED` for password-protected files.
   */
  const read = async (data: ArrayBuffer): Promise<PdfFileInfo> => {
    const doc = await PDFDocument.load(data, { ignoreEncryption: true })
    if (doc.isEncrypted) throw new Error('ENCRYPTED')
    return {
      title: doc.getTitle() ?? '',
      author: doc.getAuthor() ?? '',
      subject: doc.getSubject() ?? '',
      keywords: doc.getKeywords() ?? '',
      producer: doc.getProducer() ?? '',
      creator: doc.getCreator() ?? '',
      creationDate: doc.getCreationDate() ?? null,
      modificationDate: doc.getModificationDate() ?? null,
      pageCount: doc.getPageCount(),
    }
  }

  /**
   * Apply `meta` to the PDF and return the new bytes. The comma-
   * separated keywords string is split, trimmed and stripped of empty
   * entries before being handed to pdf-lib. Date fields are skipped
   * when null so the existing values are preserved.
   */
  const write = async (data: ArrayBuffer, meta: PdfMeta): Promise<Uint8Array> => {
    const doc = await PDFDocument.load(data, { ignoreEncryption: true })
    if (doc.isEncrypted) throw new Error('ENCRYPTED')

    doc.setTitle(meta.title)
    doc.setAuthor(meta.author)
    doc.setSubject(meta.subject)
    const kws = meta.keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
    doc.setKeywords(kws)
    doc.setProducer(meta.producer)
    doc.setCreator(meta.creator)
    if (meta.creationDate) doc.setCreationDate(meta.creationDate)
    if (meta.modificationDate) doc.setModificationDate(meta.modificationDate)

    return await doc.save()
  }

  return { read, write }
}
