export type CssUnit = 'px' | 'rem' | 'em' | 'pt' | 'percent'

export const UNITS: CssUnit[] = ['px', 'rem', 'em', 'pt', 'percent']

const PX_PER_PT = 96 / 72

export const useUnity = () => {
  const toPx = (value: number, unit: CssUnit, baseFontPx: number): number => {
    const base = baseFontPx > 0 ? baseFontPx : 16
    switch (unit) {
      case 'px':
        return value
      case 'rem':
        return value * base
      case 'em':
        return value * base
      case 'pt':
        return value * PX_PER_PT
      case 'percent':
        return (value / 100) * base
    }
  }

  const fromPx = (px: number, unit: CssUnit, baseFontPx: number): number => {
    const base = baseFontPx > 0 ? baseFontPx : 16
    switch (unit) {
      case 'px':
        return px
      case 'rem':
        return px / base
      case 'em':
        return px / base
      case 'pt':
        return px / PX_PER_PT
      case 'percent':
        return (px / base) * 100
    }
  }

  const convertAll = (
    value: number,
    fromUnit: CssUnit,
    baseFontPx: number,
  ): Record<CssUnit, number> => {
    const px = toPx(value, fromUnit, baseFontPx)
    return {
      px: fromPx(px, 'px', baseFontPx),
      rem: fromPx(px, 'rem', baseFontPx),
      em: fromPx(px, 'em', baseFontPx),
      pt: fromPx(px, 'pt', baseFontPx),
      percent: fromPx(px, 'percent', baseFontPx),
    }
  }

  return { toPx, fromPx, convertAll }
}
