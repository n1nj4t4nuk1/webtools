/**
 * useCroppy
 *
 * Composable powering the Croppy tool: crops a region of a source
 * image into a new canvas at native source resolution (so the
 * surviving pixels are bit-identical to the original) and re-encodes
 * the result as PNG, JPEG or WebP.
 *
 * PNG output is bit-perfect: the only operation applied is a
 * `drawImage` with the same source/destination size — no smoothing or
 * downscaling. JPEG and WebP go through a lossy encoder, which adds
 * one generation of compression artifacts on top of whatever the
 * source already had.
 */

/** Output encoders. WebP support is universal in modern browsers. */
export type OutputFormat = 'png' | 'jpeg' | 'webp'

export const FORMATS: OutputFormat[] = ['png', 'jpeg', 'webp']

const MIME: Record<OutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

const EXT: Record<OutputFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
}

/** Crop rectangle in source pixels (always non-negative). */
export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** Aspect-ratio presets exposed in the UI. `null` = free / no lock. */
export const ASPECT_PRESETS: { id: string; ratio: number | null }[] = [
  { id: 'free', ratio: null },
  { id: 'square', ratio: 1 },
  { id: 'r4_3', ratio: 4 / 3 },
  { id: 'r3_4', ratio: 3 / 4 },
  { id: 'r16_9', ratio: 16 / 9 },
  { id: 'r9_16', ratio: 9 / 16 },
  { id: 'r3_2', ratio: 3 / 2 },
  { id: 'r2_3', ratio: 2 / 3 },
]

/**
 * Pick a sensible output format based on the source file's MIME type.
 * Defaults to PNG when in doubt so users never silently lose quality.
 */
export const defaultFormatFor = (mime: string): OutputFormat => {
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpeg'
  if (mime === 'image/webp') return 'webp'
  return 'png'
}

export const useCroppy = () => {
  /** Decode a file into an `ImageBitmap` for canvas rendering. */
  const loadBitmap = async (file: File): Promise<ImageBitmap> =>
    await createImageBitmap(file)

  /**
   * Copy the cropped region of `source` into `canvas`, sized exactly
   * to the crop rectangle so output pixels match input pixels 1:1.
   * Smoothing is disabled because no rescaling happens — the call is
   * a pure block copy.
   *
   * Throws `NO_CONTEXT` if the canvas can't supply a 2D context, and
   * `EMPTY_CROP` if the rectangle ends up zero-sized after clamping.
   */
  const cropToCanvas = (
    canvas: HTMLCanvasElement,
    source: ImageBitmap,
    rect: Rect,
  ): void => {
    const sx = Math.max(0, Math.min(source.width - 1, Math.floor(rect.x)))
    const sy = Math.max(0, Math.min(source.height - 1, Math.floor(rect.y)))
    const sw = Math.max(1, Math.min(source.width - sx, Math.floor(rect.w)))
    const sh = Math.max(1, Math.min(source.height - sy, Math.floor(rect.h)))
    if (sw <= 0 || sh <= 0) throw new Error('EMPTY_CROP')

    canvas.width = sw
    canvas.height = sh
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('NO_CONTEXT')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, sw, sh)
  }

  /**
   * Encode `canvas` as a Blob in the requested format. `quality`
   * (0-100) is honored for JPEG and WebP only; PNG is always lossless.
   */
  const exportBlob = async (
    canvas: HTMLCanvasElement,
    format: OutputFormat,
    quality: number,
  ): Promise<Blob> => {
    return await new Promise<Blob>((resolve, reject) => {
      const q =
        format === 'png' ? undefined : Math.max(0, Math.min(1, quality / 100))
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('ENCODE_FAILED'))),
        MIME[format],
        q,
      )
    })
  }

  /** Map an output format to the extension used in the download name. */
  const extFor = (format: OutputFormat): string => EXT[format]

  /**
   * Normalize a rectangle: forces positive width/height, clamps to
   * `[0, w]` / `[0, h]` and enforces a `minSize` so tiny accidental
   * drags are bumped up to something usable.
   */
  const normalize = (
    rect: Rect,
    bounds: { w: number; h: number },
    minSize = 8,
  ): Rect => {
    let { x, y, w, h } = rect
    if (w < 0) {
      x += w
      w = -w
    }
    if (h < 0) {
      y += h
      h = -h
    }
    x = Math.max(0, Math.min(bounds.w - minSize, x))
    y = Math.max(0, Math.min(bounds.h - minSize, y))
    w = Math.max(minSize, Math.min(bounds.w - x, w))
    h = Math.max(minSize, Math.min(bounds.h - y, h))
    return { x, y, w, h }
  }

  return { loadBitmap, cropToCanvas, exportBlob, extFor, normalize }
}
