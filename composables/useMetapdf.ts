import { PDFDocument } from 'pdf-lib'

export interface PdfMeta {
  title: string
  author: string
  subject: string
  keywords: string
  producer: string
  creator: string
  creationDate: Date | null
  modificationDate: Date | null
}

export interface PdfFileInfo extends PdfMeta {
  pageCount: number
}

export const useMetapdf = () => {
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
