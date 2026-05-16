export type OutputFormat = 'png' | 'jpeg' | 'webp'

export const OUTPUT_FORMATS: OutputFormat[] = ['png', 'jpeg', 'webp']

export const MIME_MAP: Record<OutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export const EXT_MAP: Record<OutputFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
}

export interface ConversionResult {
  blob: Blob
  width: number
  height: number
}

export const useConvy = () => {
  const detectFormat = (file: File): string => {
    const type = file.type || ''
    if (type.startsWith('image/')) return type.replace('image/', '').toUpperCase()
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    return ext.toUpperCase() || 'unknown'
  }

  const supportsQuality = (format: OutputFormat): boolean =>
    format === 'jpeg' || format === 'webp'

  const loadBitmap = async (file: File): Promise<ImageBitmap> => {
    return await createImageBitmap(file)
  }

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

  const inspect = async (file: File): Promise<{ width: number; height: number }> => {
    const bitmap = await createImageBitmap(file)
    const result = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return result
  }

  return { detectFormat, supportsQuality, convert, inspect }
}
