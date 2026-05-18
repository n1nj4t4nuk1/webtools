/**
 * useShadowy
 *
 * Composable powering the Shadowy tool: builds the `box-shadow` CSS
 * value from a list of structured shadows. Each shadow is an
 * independent layer with offset, blur, spread, color, alpha and an
 * `inset` flag — the same parameters CSS exposes.
 */

/** A single `box-shadow` layer. */
export interface Shadow {
  id: string
  /** Horizontal offset in pixels. */
  x: number
  /** Vertical offset in pixels. */
  y: number
  blur: number
  spread: number
  /** Base color (CSS hex `#rrggbb`). Combined with `alpha` on serialisation. */
  color: string
  /** Alpha in `[0..1]`; <1 forces the output to use `rgba()`. */
  alpha: number
  inset: boolean
}

/** Clamp `n` into `[min, max]`. */
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n))

/** Parse `#rrggbb` into a `{ r, g, b }` triplet, defaulting invalid digits to 0. */
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return { r, g, b }
}

/**
 * Render `hex + alpha` as either the original hex (alpha ≥ 1) or as
 * `rgba(r, g, b, a)`. Alpha is clamped and printed with two decimals
 * for stable output.
 */
const formatColor = (hex: string, alpha: number): string => {
  const a = clamp(alpha, 0, 1)
  if (a >= 1) return hex
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
}

export const useShadowy = () => {
  /**
   * Serialise the shadow layers as a CSS `box-shadow` value. Empty
   * input becomes `none`. Each layer is emitted in the canonical
   * `[inset] <x> <y> <blur> <spread> <color>` order.
   */
  const buildCss = (shadows: Shadow[]): string => {
    if (shadows.length === 0) return 'none'
    return shadows
      .map((s) => {
        const parts: string[] = []
        if (s.inset) parts.push('inset')
        parts.push(
          `${s.x}px`,
          `${s.y}px`,
          `${s.blur}px`,
          `${s.spread}px`,
          formatColor(s.color, s.alpha),
        )
        return parts.join(' ')
      })
      .join(', ')
  }
  return { buildCss }
}
