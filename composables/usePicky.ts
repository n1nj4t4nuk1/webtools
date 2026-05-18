import { rgbToHex, rgbToHsl, type Rgb, type Hsl } from '~/composables/useColory'

export interface Pick {
  x: number
  y: number
  rgb: Rgb
  hex: string
  hsl: Hsl
}

export const usePicky = () => {
  const loadBitmap = async (file: File): Promise<ImageBitmap> =>
    await createImageBitmap(file)

  const drawToCanvas = (
    bitmap: ImageBitmap,
    canvas: HTMLCanvasElement,
  ): void => {
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('NO_CONTEXT')
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(bitmap, 0, 0)
  }

  const pickAt = (
    canvas: HTMLCanvasElement,
    x: number,
    y: number,
  ): Pick | null => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    const ix = Math.max(0, Math.min(canvas.width - 1, Math.floor(x)))
    const iy = Math.max(0, Math.min(canvas.height - 1, Math.floor(y)))
    const data = ctx.getImageData(ix, iy, 1, 1).data
    const rgb: Rgb = { r: data[0], g: data[1], b: data[2] }
    return {
      x: ix,
      y: iy,
      rgb,
      hex: rgbToHex(rgb),
      hsl: rgbToHsl(rgb),
    }
  }

  const sampleAverage = (
    canvas: HTMLCanvasElement,
    x: number,
    y: number,
    radius: number,
  ): Pick | null => {
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null
    const r = Math.max(0, Math.floor(radius))
    if (r === 0) return pickAt(canvas, x, y)
    const ix = Math.max(0, Math.min(canvas.width - 1, Math.floor(x)))
    const iy = Math.max(0, Math.min(canvas.height - 1, Math.floor(y)))
    const sx = Math.max(0, ix - r)
    const sy = Math.max(0, iy - r)
    const ex = Math.min(canvas.width, ix + r + 1)
    const ey = Math.min(canvas.height, iy + r + 1)
    const w = ex - sx
    const h = ey - sy
    if (w <= 0 || h <= 0) return null
    const data = ctx.getImageData(sx, sy, w, h).data
    let sumR = 0
    let sumG = 0
    let sumB = 0
    let n = 0
    for (let i = 0; i < data.length; i += 4) {
      sumR += data[i]
      sumG += data[i + 1]
      sumB += data[i + 2]
      n++
    }
    if (n === 0) return null
    const rgb: Rgb = {
      r: Math.round(sumR / n),
      g: Math.round(sumG / n),
      b: Math.round(sumB / n),
    }
    return {
      x: ix,
      y: iy,
      rgb,
      hex: rgbToHex(rgb),
      hsl: rgbToHsl(rgb),
    }
  }

  return { loadBitmap, drawToCanvas, pickAt, sampleAverage }
}
