/**
 * useGradienty
 *
 * Composable powering the Gradienty tool: builds CSS gradient values
 * (linear, radial or conic) from a structured configuration so the UI
 * can preview them in real time and let the user copy the resulting
 * `background: ...` string.
 */

/** Gradient flavor; maps 1:1 to the matching CSS `*-gradient` function. */
export type GradientType = 'linear' | 'radial' | 'conic'

/** Shape of a radial gradient. */
export type RadialShape = 'circle' | 'ellipse'

/** Anchor positions accepted by `at <position>` in radial/conic gradients. */
export type GradientPosition =
  | 'center'
  | 'top'
  | 'top right'
  | 'right'
  | 'bottom right'
  | 'bottom'
  | 'bottom left'
  | 'left'
  | 'top left'

/** A single color stop. `position` is 0-100 (percent). */
export interface ColorStop {
  id: string
  color: string
  position: number
}

/** Full configuration of a gradient. */
export interface GradientConfig {
  type: GradientType
  /** Angle in degrees; used by linear (`<angle>`) and conic (`from <angle>`). */
  angle: number
  /** Shape; only used when `type === 'radial'`. */
  shape: RadialShape
  /** Anchor; only used by radial and conic. */
  position: GradientPosition
  stops: ColorStop[]
}

/** Anchor positions in display order (grid-style). */
export const POSITIONS: GradientPosition[] = [
  'top left',
  'top',
  'top right',
  'left',
  'center',
  'right',
  'bottom left',
  'bottom',
  'bottom right',
]

export const useGradienty = () => {
  /**
   * Serialise a {@link GradientConfig} to a CSS gradient string. Stops
   * are sorted by position so the user can drag them in any order
   * without scrambling the output.
   */
  const buildCss = (cfg: GradientConfig): string => {
    const sorted = [...cfg.stops].sort((a, b) => a.position - b.position)
    const stops = sorted.map((s) => `${s.color} ${s.position}%`).join(', ')
    if (cfg.type === 'linear') {
      return `linear-gradient(${cfg.angle}deg, ${stops})`
    }
    if (cfg.type === 'radial') {
      return `radial-gradient(${cfg.shape} at ${cfg.position}, ${stops})`
    }
    return `conic-gradient(from ${cfg.angle}deg at ${cfg.position}, ${stops})`
  }
  return { buildCss }
}
