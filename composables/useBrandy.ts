/**
 * useBrandy
 *
 * Composable powering the Brandy tool: stamps a watermark — text or
 * image — onto a source bitmap using Canvas 2D. Supports the same nine
 * fixed anchor positions as {@link useMarkpdf} plus a tiled mode that
 * repeats the stamp across the whole image.
 *
 * Rendering happens entirely on the GPU/CPU canvas pipeline. The
 * composable is stateless: callers own the source canvas (so they can
 * resize it for previews), pass it in along with the parsed options
 * and receive nothing back — the function mutates the canvas in place.
 */

/** Watermark family. */
export type WatermarkKind = 'text' | 'image'

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

/** Output encoders. WebP is opt-in (Safari support is recent). */
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

/** Web-safe font families exposed in the UI. */
export const FONT_FAMILIES = [
  'sans-serif',
  'serif',
  'monospace',
  'system-ui',
  'Georgia, serif',
  'Helvetica, Arial, sans-serif',
  'Courier New, monospace',
  'Impact, sans-serif',
] as const

/** Render-time options common to both kinds. */
interface CommonOptions {
  position: Position
  /** Rotation in degrees; positive = clockwise (canvas convention). */
  rotation: number
  /** Opacity in `[0..1]`; clamped before drawing. */
  opacity: number
  /** Margin in source pixels for non-tiled positions. */
  margin: number
  /** Gap between tiles in source pixels (tiled mode only). */
  tileGap: number
}

/** Text-watermark options. */
export interface TextWatermarkOptions extends CommonOptions {
  kind: 'text'
  text: string
  /** Font size as a percentage of the source image's shortest side. */
  fontSizePct: number
  fontFamily: string
  color: string
  bold: boolean
  italic: boolean
}

/** Image-watermark options. The bitmap is passed alongside, not here. */
export interface ImageWatermarkOptions extends CommonOptions {
  kind: 'image'
  /** Watermark width as a percentage of the source image's width. */
  widthPct: number
}

export type WatermarkOptions = TextWatermarkOptions | ImageWatermarkOptions

export const useBrandy = () => {
  /** Decode `file` into an `ImageBitmap` for canvas rendering. */
  const loadBitmap = async (file: File): Promise<ImageBitmap> =>
    await createImageBitmap(file)

  /**
   * Compute the (cx, cy) center for a non-tiled position, given the
   * source dimensions, the watermark's bounding box, and the margin.
   */
  const anchorCenter = (
    pos: Position,
    pw: number,
    ph: number,
    wmW: number,
    wmH: number,
    margin: number,
  ): { cx: number; cy: number } => {
    switch (pos) {
      case 'topLeft':
        return { cx: margin + wmW / 2, cy: margin + wmH / 2 }
      case 'top':
        return { cx: pw / 2, cy: margin + wmH / 2 }
      case 'topRight':
        return { cx: pw - margin - wmW / 2, cy: margin + wmH / 2 }
      case 'left':
        return { cx: margin + wmW / 2, cy: ph / 2 }
      case 'right':
        return { cx: pw - margin - wmW / 2, cy: ph / 2 }
      case 'bottomLeft':
        return { cx: margin + wmW / 2, cy: ph - margin - wmH / 2 }
      case 'bottom':
        return { cx: pw / 2, cy: ph - margin - wmH / 2 }
      case 'bottomRight':
        return { cx: pw - margin - wmW / 2, cy: ph - margin - wmH / 2 }
      case 'center':
      default:
        return { cx: pw / 2, cy: ph / 2 }
    }
  }

  /**
   * Compute the size of the rotated bounding box for a `w × h` rect
   * tilted by `rotationDeg` degrees — used to pad tile pitches so the
   * stamps don't overlap visually.
   */
  const rotatedBox = (
    w: number,
    h: number,
    rotationDeg: number,
  ): { w: number; h: number } => {
    const rad = (Math.abs(rotationDeg) * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    return {
      w: Math.abs(w * cos) + Math.abs(h * sin),
      h: Math.abs(w * sin) + Math.abs(h * cos),
    }
  }

  /**
   * Render the base bitmap into `canvas` (resized to match the bitmap)
   * and stamp the watermark on top using the supplied options. For
   * `image` kind, the caller must also pass `watermarkBitmap`.
   */
  const renderToCanvas = (
    canvas: HTMLCanvasElement,
    base: ImageBitmap,
    options: WatermarkOptions,
    watermarkBitmap?: ImageBitmap | null,
  ): void => {
    const pw = base.width
    const ph = base.height
    canvas.width = pw
    canvas.height = ph

    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('NO_CONTEXT')

    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(base, 0, 0)

    if (options.kind === 'text') {
      if (!options.text.trim()) return
      const minSide = Math.min(pw, ph)
      const fontPx = Math.max(8, (options.fontSizePct / 100) * minSide)
      const weight = options.bold ? 'bold ' : ''
      const style = options.italic ? 'italic ' : ''
      ctx.font = `${style}${weight}${fontPx}px ${options.fontFamily}`
      ctx.fillStyle = options.color
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      const metrics = ctx.measureText(options.text)
      const textW = metrics.width
      const textH = fontPx

      const drawAt = (cx: number, cy: number) => {
        ctx.save()
        ctx.globalAlpha = Math.max(0, Math.min(1, options.opacity))
        ctx.translate(cx, cy)
        ctx.rotate((options.rotation * Math.PI) / 180)
        ctx.fillText(options.text, 0, 0)
        ctx.restore()
      }

      if (options.position === 'tiled') {
        const box = rotatedBox(textW, textH, options.rotation)
        const stepX = box.w + Math.max(0, options.tileGap)
        const stepY = box.h + Math.max(0, options.tileGap)
        for (let cy = stepY / 2; cy < ph; cy += stepY) {
          for (let cx = stepX / 2; cx < pw; cx += stepX) {
            drawAt(cx, cy)
          }
        }
        return
      }

      const { cx, cy } = anchorCenter(
        options.position,
        pw,
        ph,
        textW,
        textH,
        Math.max(0, options.margin),
      )
      drawAt(cx, cy)
      return
    }

    // image kind
    if (!watermarkBitmap) return
    const targetW = Math.max(1, (options.widthPct / 100) * pw)
    const scale = targetW / watermarkBitmap.width
    const targetH = watermarkBitmap.height * scale

    const drawAt = (cx: number, cy: number) => {
      ctx.save()
      ctx.globalAlpha = Math.max(0, Math.min(1, options.opacity))
      ctx.translate(cx, cy)
      ctx.rotate((options.rotation * Math.PI) / 180)
      ctx.drawImage(
        watermarkBitmap,
        -targetW / 2,
        -targetH / 2,
        targetW,
        targetH,
      )
      ctx.restore()
    }

    if (options.position === 'tiled') {
      const box = rotatedBox(targetW, targetH, options.rotation)
      const stepX = box.w + Math.max(0, options.tileGap)
      const stepY = box.h + Math.max(0, options.tileGap)
      for (let cy = stepY / 2; cy < ph; cy += stepY) {
        for (let cx = stepX / 2; cx < pw; cx += stepX) {
          drawAt(cx, cy)
        }
      }
      return
    }

    const { cx, cy } = anchorCenter(
      options.position,
      pw,
      ph,
      targetW,
      targetH,
      Math.max(0, options.margin),
    )
    drawAt(cx, cy)
  }

  /**
   * Encode `canvas` as a Blob in the requested format. Quality is only
   * honored for JPEG and WebP; PNG is always lossless.
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

  return { loadBitmap, renderToCanvas, exportBlob, extFor }
}
