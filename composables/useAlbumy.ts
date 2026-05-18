/**
 * useAlbumy
 *
 * Composable powering the Albumy tool: builds a single PDF from a list of
 * images. Supports A4, Letter or "fit-to-image" page sizes, portrait or
 * landscape orientations, configurable margins and JPEG quality (used when
 * re-encoding images whose format is not directly embeddable in PDF).
 *
 * pdf-lib can embed JPEG and PNG natively. Any other format (WebP, GIF,
 * BMP, AVIF…) is rasterised to JPEG via a canvas before embedding.
 */
import { PDFDocument } from 'pdf-lib'

/** Logical page size: standard A4, US Letter, or fit-each-page-to-image. */
export type PageSize = 'a4' | 'letter' | 'fit'

/** Page orientation, only meaningful for standard sizes (a4, letter). */
export type Orientation = 'portrait' | 'landscape'

/** One image to add to the PDF, with its raw bytes and metadata. */
export interface AlbumyItem {
  name: string
  data: ArrayBuffer
  width: number
  height: number
  mime: string
}

/** Render options used by {@link useAlbumy.buildPdf}. */
export interface AlbumyOptions {
  pageSize: PageSize
  orientation: Orientation
  /** Margin around the image in PDF points (1/72 inch). */
  margin: number
  /** JPEG quality (0-100) used when re-encoding non-JPEG/PNG sources. */
  quality: number
}

/** Standard page sizes in PDF points (portrait). */
const PAGE_DIMENSIONS: Record<Exclude<PageSize, 'fit'>, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
}

/**
 * Re-encode arbitrary image bytes to JPEG via a canvas. Used as a fallback
 * for formats pdf-lib can't embed directly. The canvas is filled with white
 * first so that transparent pixels become white (JPEG has no alpha).
 */
const reencodeToJpeg = async (
  data: ArrayBuffer,
  mime: string,
  quality: number,
): Promise<ArrayBuffer> => {
  const blob = new Blob([data], { type: mime })
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('NO_CONTEXT')
  }
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0)
  bitmap.close()
  const jpegBlob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', Math.max(0, Math.min(1, quality / 100)))
  })
  if (!jpegBlob) throw new Error('ENCODE_FAILED')
  return await jpegBlob.arrayBuffer()
}

export const useAlbumy = () => {
  /**
   * Quickly read the width and height of an image file without keeping
   * the bitmap around. Used by the UI to display previews and metadata.
   */
  const inspect = async (
    file: File,
  ): Promise<{ width: number; height: number }> => {
    const bitmap = await createImageBitmap(file)
    const result = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return result
  }

  /**
   * Build a PDF from the given image items. Each image becomes one page;
   * the image is scaled to fit inside the page minus the margin while
   * preserving its aspect ratio. Throws `NO_IMAGES` if `items` is empty.
   */
  const buildPdf = async (
    items: AlbumyItem[],
    opts: AlbumyOptions,
  ): Promise<Uint8Array> => {
    if (items.length === 0) throw new Error('NO_IMAGES')
    const doc = await PDFDocument.create()

    for (const item of items) {
      let imageBytes = item.data
      let mime = item.mime
      const isJpeg = mime === 'image/jpeg' || mime === 'image/jpg'
      const isPng = mime === 'image/png'

      if (!isJpeg && !isPng) {
        imageBytes = await reencodeToJpeg(item.data, mime, opts.quality)
        mime = 'image/jpeg'
      }

      const embedded = isPng
        ? await doc.embedPng(imageBytes)
        : await doc.embedJpg(imageBytes)

      let pageWidth: number
      let pageHeight: number

      if (opts.pageSize === 'fit') {
        const margin2 = opts.margin * 2
        pageWidth = embedded.width + margin2
        pageHeight = embedded.height + margin2
      } else {
        const [w, h] = PAGE_DIMENSIONS[opts.pageSize]
        if (opts.orientation === 'landscape') {
          pageWidth = h
          pageHeight = w
        } else {
          pageWidth = w
          pageHeight = h
        }
      }

      const page = doc.addPage([pageWidth, pageHeight])
      const availableW = pageWidth - opts.margin * 2
      const availableH = pageHeight - opts.margin * 2
      const scale = Math.min(
        availableW / embedded.width,
        availableH / embedded.height,
        1,
      )
      const drawW = embedded.width * scale
      const drawH = embedded.height * scale
      const x = (pageWidth - drawW) / 2
      const y = (pageHeight - drawH) / 2
      page.drawImage(embedded, { x, y, width: drawW, height: drawH })
    }

    return await doc.save()
  }

  return { inspect, buildPdf }
}
