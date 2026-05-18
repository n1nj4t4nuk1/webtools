import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'

export type Position =
  | 'center'
  | 'topLeft'
  | 'top'
  | 'topRight'
  | 'left'
  | 'right'
  | 'bottomLeft'
  | 'bottom'
  | 'bottomRight'
  | 'tiled'

export const POSITIONS: Position[] = [
  'center',
  'topLeft',
  'top',
  'topRight',
  'left',
  'right',
  'bottomLeft',
  'bottom',
  'bottomRight',
  'tiled',
]

export interface WatermarkOptions {
  text: string
  fontSize: number
  color: { r: number; g: number; b: number }
  opacity: number
  rotation: number
  position: Position
  pages: number[]
  margin: number
  tileGap: number
}

export const hexToRgb01 = (hex: string): { r: number; g: number; b: number } => {
  const m = hex.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i)
  if (!m) return { r: 0.5, g: 0.5, b: 0.5 }
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  }
}

export const useMarkpdf = () => {
  const countPages = async (data: ArrayBuffer): Promise<number> => {
    try {
      const doc = await PDFDocument.load(data, { ignoreEncryption: true })
      return doc.getPageCount()
    } catch {
      return 0
    }
  }

  const apply = async (
    data: ArrayBuffer,
    options: WatermarkOptions,
  ): Promise<Uint8Array> => {
    if (!options.text.trim()) throw new Error('EMPTY_TEXT')

    const doc = await PDFDocument.load(data, { ignoreEncryption: true })
    if (doc.isEncrypted) throw new Error('ENCRYPTED')

    const font = await doc.embedFont(StandardFonts.Helvetica)
    const allPages = doc.getPages()
    const targets =
      options.pages.length === 0
        ? allPages
        : options.pages
            .map((n) => allPages[n - 1])
            .filter((p): p is (typeof allPages)[number] => Boolean(p))

    const color = rgb(options.color.r, options.color.g, options.color.b)
    const opacity = Math.max(0, Math.min(1, options.opacity))
    const size = Math.max(4, options.fontSize)
    const rot = options.rotation
    const margin = Math.max(0, options.margin)

    const textWidth = font.widthOfTextAtSize(options.text, size)
    const textHeight = font.heightAtSize(size)

    for (const page of targets) {
      const { width: pw, height: ph } = page.getSize()

      const drawAt = (cx: number, cy: number) => {
        const rad = (rot * Math.PI) / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const x = cx - (textWidth / 2) * cos + (textHeight / 2) * sin
        const y = cy - (textWidth / 2) * sin - (textHeight / 2) * cos
        page.drawText(options.text, {
          x,
          y,
          size,
          font,
          color,
          opacity,
          rotate: degrees(rot),
        })
      }

      if (options.position === 'tiled') {
        const rad = (Math.abs(rot) * Math.PI) / 180
        const boxW = Math.abs(textWidth * Math.cos(rad)) + Math.abs(textHeight * Math.sin(rad))
        const boxH = Math.abs(textWidth * Math.sin(rad)) + Math.abs(textHeight * Math.cos(rad))
        const stepX = boxW + Math.max(0, options.tileGap)
        const stepY = boxH + Math.max(0, options.tileGap)
        for (let cy = stepY / 2; cy < ph; cy += stepY) {
          for (let cx = stepX / 2; cx < pw; cx += stepX) {
            drawAt(cx, cy)
          }
        }
        continue
      }

      let cx = pw / 2
      let cy = ph / 2
      switch (options.position) {
        case 'topLeft':
          cx = margin + textWidth / 2
          cy = ph - margin - textHeight / 2
          break
        case 'top':
          cx = pw / 2
          cy = ph - margin - textHeight / 2
          break
        case 'topRight':
          cx = pw - margin - textWidth / 2
          cy = ph - margin - textHeight / 2
          break
        case 'left':
          cx = margin + textWidth / 2
          cy = ph / 2
          break
        case 'right':
          cx = pw - margin - textWidth / 2
          cy = ph / 2
          break
        case 'bottomLeft':
          cx = margin + textWidth / 2
          cy = margin + textHeight / 2
          break
        case 'bottom':
          cx = pw / 2
          cy = margin + textHeight / 2
          break
        case 'bottomRight':
          cx = pw - margin - textWidth / 2
          cy = margin + textHeight / 2
          break
        case 'center':
        default:
          cx = pw / 2
          cy = ph / 2
          break
      }
      drawAt(cx, cy)
    }

    return await doc.save()
  }

  return { countPages, apply }
}
