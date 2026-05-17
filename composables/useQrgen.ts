import QRCode from 'qrcode'

export type ErrorLevel = 'L' | 'M' | 'Q' | 'H'

export const ERROR_LEVELS: ErrorLevel[] = ['L', 'M', 'Q', 'H']

export interface QrOptions {
  text: string
  errorLevel: ErrorLevel
  margin: number
  size: number
  fgColor: string
  bgColor: string
}

export const useQrgen = () => {
  const buildOpts = (opts: QrOptions) => ({
    errorCorrectionLevel: opts.errorLevel,
    margin: Math.max(0, Math.min(20, opts.margin)),
    width: Math.max(64, Math.min(2048, opts.size)),
    color: {
      dark: opts.fgColor,
      light: opts.bgColor,
    },
  })

  const toSvg = async (opts: QrOptions): Promise<string> => {
    if (opts.text.length === 0) return ''
    return await QRCode.toString(opts.text, {
      type: 'svg',
      ...buildOpts(opts),
    })
  }

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
