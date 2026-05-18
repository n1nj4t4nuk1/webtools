/**
 * useImageResize
 *
 * Composable powering the Mochi tool: resizes an image to the requested
 * dimensions via a `<canvas>` and re-encodes it as JPEG, PNG or WebP.
 * Uses `createImageBitmap` when available (faster, off-thread) and
 * falls back to `<img>` decoding for older browsers.
 */

/** Output MIME accepted by `canvas.toBlob`. */
export type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp'

/** Resize parameters. */
export interface ResizeOptions {
  width: number
  height: number
  format: OutputFormat
  /** Quality in the `0..1` range (JPEG/WebP only). Defaults to 0.9. */
  quality?: number
}

/** Output of a successful resize. */
export interface ResizeResult {
  blob: Blob
  /** Object URL pointing at `blob`; the caller is responsible for revoking it. */
  url: string
  width: number
  height: number
  bytes: number
}

/** Decode `file` into a bitmap, falling back to `<img>` for old Safari. */
const loadBitmap = async (file: File): Promise<ImageBitmap> => {
  if ('createImageBitmap' in window) {
    return await createImageBitmap(file)
  }
  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img as unknown as ImageBitmap)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

/** Promise-wrapper around `canvas.toBlob` that rejects on null. */
const canvasToBlob = (
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality: number,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob returned null'))),
      format,
      quality,
    )
  })

export const useImageResize = () => {
  /**
   * Resize `file` to `options.width × options.height` and re-encode it
   * in the requested format. Dimensions are rounded to integers and
   * clamped to at least 1×1. Uses high-quality smoothing on the canvas.
   */
  const resize = async (
    file: File,
    options: ResizeOptions,
  ): Promise<ResizeResult> => {
    const bitmap = await loadBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(options.width))
    canvas.height = Math.max(1, Math.round(options.height))

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('No 2D context available')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    const blob = await canvasToBlob(canvas, options.format, options.quality ?? 0.9)
    const url = URL.createObjectURL(blob)

    return {
      blob,
      url,
      width: canvas.width,
      height: canvas.height,
      bytes: blob.size,
    }
  }

  /** Quickly read the source dimensions without resizing or re-encoding. */
  const readDimensions = async (file: File) => {
    const bitmap = await loadBitmap(file)
    return { width: bitmap.width, height: bitmap.height }
  }

  return { resize, readDimensions }
}
