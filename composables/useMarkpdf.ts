/**
 * useMarkpdf
 *
 * Composable powering the Markpdf tool: stamps a text watermark on
 * selected pages of a PDF using `pdf-lib`. Supports nine fixed anchor
 * positions (the eight edges/corners plus center) and a "tiled" mode
 * that repeats the watermark across the whole page on a configurable
 * grid. The text can be rotated around its visual center; the
 * trigonometric offsets in `drawAt` compensate so the rotation pivots
 * around the centroid rather than the baseline-left corner that
 * `page.drawText` would normally use.
 */
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'

/** Fixed anchor positions plus the special `tiled` (repeating) mode. */
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

/** All positions, in display order. */
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

/** Watermark configuration passed to {@link useMarkpdf.apply}. */
export interface WatermarkOptions {
  text: string
  /** Font size in PDF points; clamped to ≥4. */
  fontSize: number
  /** Color in the `[0..1]` per-channel range that pdf-lib expects. */
  color: { r: number; g: number; b: number }
  /** Opacity in `[0..1]`; clamped on apply. */
  opacity: number
  /** Rotation in degrees; positive = counterclockwise. */
  rotation: number
  /** Where to place the stamp. `tiled` ignores `margin`. */
  position: Position
  /** Page numbers (1-based). Empty array means "all pages". */
  pages: number[]
  /** Distance from the page edge for non-tiled positions, in PDF points. */
  margin: number
  /** Gap between repetitions in tiled mode, in PDF points. */
  tileGap: number
}

/**
 * Convert a CSS-style hex color to pdf-lib's `{ r, g, b }` triplet in
 * the `[0..1]` range. Falls back to mid-grey for malformed input so the
 * UI keeps working while the user is typing.
 */
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
  /** Quickly read a PDF's page count. Returns 0 on any parse failure. */
  const countPages = async (data: ArrayBuffer): Promise<number> => {
    try {
      const doc = await PDFDocument.load(data, { ignoreEncryption: true })
      return doc.getPageCount()
    } catch {
      return 0
    }
  }

  /**
   * Apply the watermark to the requested pages and return the new
   * PDF's bytes. Throws:
   *   - `EMPTY_TEXT` if no text was provided.
   *   - `ENCRYPTED` if the source PDF is password-protected.
   *
   * Implementation note: `page.drawText` always treats `(x, y)` as the
   * baseline-left of the text. When rotation is involved the visible
   * text shifts relative to that anchor, so `drawAt` precomputes the
   * `(x, y)` such that the visual *center* of the text ends up at the
   * requested `(cx, cy)`.
   */
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

      /** Draw the rotated text so its visual centroid is at (cx, cy). */
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
        // Bounding box of the rotated text plus the user-configurable gap
        // gives us the tile pitch. Start at half-pitch so the pattern
        // looks centered on the page.
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
