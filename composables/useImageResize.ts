export type OutputFormat = 'image/jpeg' | 'image/png' | 'image/webp'

export interface ResizeOptions {
  width: number
  height: number
  format: OutputFormat
  quality?: number
}

export interface ResizeResult {
  blob: Blob
  url: string
  width: number
  height: number
  bytes: number
}

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

  const readDimensions = async (file: File) => {
    const bitmap = await loadBitmap(file)
    return { width: bitmap.width, height: bitmap.height }
  }

  return { resize, readDimensions }
}
