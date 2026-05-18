/**
 * useQrgen
 *
 * Composable powering the Qrgen tool: thin wrapper around the `qrcode`
 * library to generate QR codes as either inline SVG strings or PNG
 * blobs. Lets the caller pick the error-correction level, margin
 * (quiet zone), pixel size and foreground / background colors.
 */
import QRCode from 'qrcode'

/**
 * Error correction levels defined by the QR spec — L (~7%) to
 * H (~30%). Higher levels survive more damage but encode less data.
 */
export type ErrorLevel = 'L' | 'M' | 'Q' | 'H'

/** All levels in display order. */
export const ERROR_LEVELS: ErrorLevel[] = ['L', 'M', 'Q', 'H']

/** Full configuration for a generated QR code. */
export interface QrOptions {
  text: string
  errorLevel: ErrorLevel
  /** Quiet zone in module units; clamped to `0..20`. */
  margin: number
  /** Output edge length in pixels; clamped to `64..2048`. */
  size: number
  /** Module (dark) color, accepts any CSS color string. */
  fgColor: string
  /** Background color, accepts any CSS color string. */
  bgColor: string
}

export const useQrgen = () => {
  /**
   * Translate {@link QrOptions} into the option shape `qrcode` expects,
   * applying the safety clamps in one place.
   */
  const buildOpts = (opts: QrOptions) => ({
    errorCorrectionLevel: opts.errorLevel,
    margin: Math.max(0, Math.min(20, opts.margin)),
    width: Math.max(64, Math.min(2048, opts.size)),
    color: {
      dark: opts.fgColor,
      light: opts.bgColor,
    },
  })

  /** Generate an SVG string. Empty text short-circuits to an empty string. */
  const toSvg = async (opts: QrOptions): Promise<string> => {
    if (opts.text.length === 0) return ''
    return await QRCode.toString(opts.text, {
      type: 'svg',
      ...buildOpts(opts),
    })
  }

  /**
   * Render the QR onto an in-memory canvas, then return its PNG blob.
   * Empty text returns a zero-byte blob so the UI can still wire up the
   * download button without a special case.
   */
  const toPngBlob = async (opts: QrOptions): Promise<Blob> => {
    if (opts.text.length === 0) {
      return new Blob([], { type: 'image/png' })
    }
    const canvas = document.createElement('canvas')
    await QRCode.toCanvas(canvas, opts.text, buildOpts(opts))
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('PNG_FAILED'))
      }, 'image/png')
    })
  }

  return { toSvg, toPngBlob }
}
