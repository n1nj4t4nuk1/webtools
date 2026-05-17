export type OutputFormat = 'png' | 'jpeg'

export const FORMATS: OutputFormat[] = ['png', 'jpeg']

const MIME: Record<OutputFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
}

const EXT: Record<OutputFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
}

export const usePixely = () => {
  const loadBitmap = async (file: File): Promise<ImageBitmap> =>
    await createImageBitmap(file)

  const pixelateToCanvas = (
    bitmap: ImageBitmap,
    blockSize: number,
    canvas: HTMLCanvasElement,
  ): void => {
    const w = bitmap.width
    const h = bitmap.height
    const size = Math.max(1, Math.floor(blockSize))
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

    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('NO_CONTEXT')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(small, 0, 0, w, h)
  }

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

  const extFor = (format: OutputFormat): string => EXT[format]

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
