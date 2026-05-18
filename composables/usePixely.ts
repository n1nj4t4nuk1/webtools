/**
 * usePixely
 *
 * Composable powering the Pixely tool: applies a "pixel art" effect to
 * an image by down-sampling it to a small canvas with high-quality
 * smoothing and then up-scaling that small canvas with smoothing
 * disabled (so each tiny pixel becomes a sharp block on the output).
 *
 * If a selection rectangle is provided, only that area is pixelated;
 * the rest of the image is drawn through unchanged. This is how the UI
 * supports "pixelate only this part" (e.g. for redacting faces).
 */

/** Output formats supported by the encoder. */
export type OutputFormat = 'png' | 'jpeg'

/** All formats in display order. */
export const FORMATS: OutputFormat[] = ['png', 'jpeg']

/** MIME type used when calling `canvas.toBlob`. */
const MIME: Record<OutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
}

/** Extension applied to the downloaded file. */
const EXT: Record<OutputFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
}

export const usePixely = () => {
  /** Decode `file` into an `ImageBitmap`. */
  const loadBitmap = async (file: File): Promise<ImageBitmap> =>
    await createImageBitmap(file)

  /**
   * Render `bitmap` into `canvas` with a pixelation effect, sized so
   * each "pixel block" is roughly `blockSize` × `blockSize` source
   * pixels. When `selection` is non-null only that area is pixelated;
   * the rest of the canvas keeps the original image.
   *
   * The trick is a two-step draw: down-sample with smoothing on, then
   * up-sample with smoothing off so each small pixel becomes a sharp
   * coloured block.
   */
  const pixelateToCanvas = (
    bitmap: ImageBitmap,
    blockSize: number,
    canvas: HTMLCanvasElement,
    selection?: { x: number; y: number; w: number; h: number } | null,
  ): void => {
    const w = bitmap.width
    const h = bitmap.height
    const size = Math.max(1, Math.floor(blockSize))

    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('NO_CONTEXT')

    if (!selection) {
      // Whole-image pixelation: down-sample to a small canvas then
      // up-sample with smoothing disabled to get the blocky look.
      const smallW = Math.max(1, Math.floor(w / size))
      const smallH = Math.max(1, Math.floor(h / size))
      const small = document.createElement('canvas')
      small.width = smallW
      small.height = smallH
      const smallCtx = small.getContext('2d')
      if (!smallCtx) throw new Error('NO_CONTEXT')
      smallCtx.imageSmoothingEnabled = true
      smallCtx.imageSmoothingQuality = 'high'
      smallCtx.drawImage(bitmap, 0, 0, smallW, smallH)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(small, 0, 0, w, h)
      return
    }

    // Selection mode: draw the full image first, then pixelate just
    // the selection rectangle on top.
    ctx.imageSmoothingEnabled = true
    ctx.drawImage(bitmap, 0, 0)

    const sx = Math.max(0, Math.floor(selection.x))
    const sy = Math.max(0, Math.floor(selection.y))
    const sw = Math.min(w - sx, Math.floor(selection.w))
    const sh = Math.min(h - sy, Math.floor(selection.h))
    if (sw < 1 || sh < 1) return

    const smallW = Math.max(1, Math.floor(sw / size))
    const smallH = Math.max(1, Math.floor(sh / size))
    const small = document.createElement('canvas')
    small.width = smallW
    small.height = smallH
    const smallCtx = small.getContext('2d')
    if (!smallCtx) throw new Error('NO_CONTEXT')
    smallCtx.imageSmoothingEnabled = true
    smallCtx.imageSmoothingQuality = 'high'
    smallCtx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, smallW, smallH)

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(small, 0, 0, smallW, smallH, sx, sy, sw, sh)
  }

  /**
   * Encode `canvas` as a Blob in the chosen format. `quality` is only
   * honored for JPEG; PNG is always lossless.
   */
  const exportBlob = async (
    canvas: HTMLCanvasElement,
    format: OutputFormat,
    quality: number,
  ): Promise<Blob> => {
    return await new Promise<Blob>((resolve, reject) => {
      const q = format === 'jpeg' ? Math.max(0, Math.min(1, quality / 100)) : undefined
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('ENCODE_FAILED'))),
        MIME[format],
        q,
      )
    })
  }

  /** Map an output format to the extension shown in the download name. */
  const extFor = (format: OutputFormat): string => EXT[format]

  /** Quickly read the image's `(width, height)` without keeping a bitmap. */
  const inspect = async (
    file: File,
  ): Promise<{ width: number; height: number }> => {
    const bitmap = await createImageBitmap(file)
    const result = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return result
  }

  return { loadBitmap, pixelateToCanvas, exportBlob, extFor, inspect }
}
