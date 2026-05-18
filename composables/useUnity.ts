/**
 * useUnity
 *
 * Composable powering the Unity tool: converts between the most common
 * CSS length units using an arbitrary `baseFontPx` (the assumed
 * pixel size of `1rem`/`1em`/`100%`). The default base is 16, matching
 * the typical browser default.
 *
 * Internally everything is normalised to pixels:
 *   value (any unit) → pixels → every other unit.
 */

/**
 * CSS units handled by the converter. `percent` represents font-size
 * style percentages (`100%` ≡ `1em`), not viewport percentages.
 */
export type CssUnit = 'px' | 'rem' | 'em' | 'pt' | 'percent'

/** Units in display order. */
export const UNITS: CssUnit[] = ['px', 'rem', 'em', 'pt', 'percent']

/** CSS uses the 1in = 72pt = 96px definition; pixels per point: 96/72. */
const PX_PER_PT = 96 / 72

export const useUnity = () => {
  /**
   * Convert any unit to pixels. `baseFontPx` is treated as ≤0 → 16 so
   * the UI never has to special-case missing input.
   */
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

  /** Inverse of {@link toPx}: pixels back to any unit. */
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

  /**
   * Express `value` (in `fromUnit`) in every supported unit at once,
   * keyed by unit name. The UI uses this to refresh every input field
   * after one of them changes.
   */
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
