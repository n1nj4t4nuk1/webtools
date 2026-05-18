/**
 * useConvy
 *
 * Composable powering the Convy tool: converts an image between PNG,
 * JPEG and WebP entirely through `<canvas>.toBlob`. PNG is lossless;
 * JPEG and WebP accept a quality (0-100) that maps to canvas's 0-1
 * range. When converting to JPEG the canvas is first filled with white
 * so transparent areas don't collapse to black.
 */

/** Output formats supported by the encoder. */
export type OutputFormat = 'png' | 'jpeg' | 'webp'

/** All formats, in display order. */
export const OUTPUT_FORMATS: OutputFormat[] = ['png', 'jpeg', 'webp']

/** MIME type used when calling `canvas.toBlob`. */
export const MIME_MAP: Record<OutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

/** Extension applied to the downloaded file. */
export const EXT_MAP: Record<OutputFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
}

/** Output of a successful conversion. */
export interface ConversionResult {
  blob: Blob
  width: number
  height: number
}

export const useConvy = () => {
  /**
   * Display name of the source file's format, used in the UI summary.
   * Prefers the MIME type when available, falls back to the extension.
   */
  const detectFormat = (file: File): string => {
    const type = file.type || ''
    if (type.startsWith('image/')) return type.replace('image/', '').toUpperCase()
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    return ext.toUpperCase() || 'unknown'
  }

  /** Whether the chosen output format honors the quality slider. */
  const supportsQuality = (format: OutputFormat): boolean =>
    format === 'jpeg' || format === 'webp'

  /** Decode the file into an `ImageBitmap` for canvas rendering. */
  const loadBitmap = async (file: File): Promise<ImageBitmap> => {
    return await createImageBitmap(file)
  }

  /**
   * Convert `file` to the requested format. The bitmap is drawn onto a
   * canvas of the same dimensions; JPEG gets a white background so
   * transparency doesn't show as black. Throws `NO_CONTEXT` or
   * `ENCODE_FAILED` on canvas failures.
   */
  const convert = async (
    file: File,
    format: OutputFormat,
    quality: number,
  ): Promise<ConversionResult> => {
    const bitmap = await loadBitmap(file)
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      throw new Error('NO_CONTEXT')
    }
    if (format === 'jpeg') {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }
    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => {
      const q = supportsQuality(format) ? Math.max(0, Math.min(1, quality / 100)) : undefined
      canvas.toBlob(resolve, MIME_MAP[format], q)
    })
    if (!blob) throw new Error('ENCODE_FAILED')
    return { blob, width: canvas.width, height: canvas.height }
  }

  /** Quickly read `width`/`height` without keeping the bitmap around. */
  const inspect = async (file: File): Promise<{ width: number; height: number }> => {
    const bitmap = await createImageBitmap(file)
    const result = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return result
  }

  return { detectFormat, supportsQuality, convert, inspect }
}
