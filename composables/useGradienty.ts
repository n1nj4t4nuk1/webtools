export type GradientType = 'linear' | 'radial' | 'conic'
export type RadialShape = 'circle' | 'ellipse'
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

export interface ColorStop {
  id: string
  color: string
  position: number
}

export interface GradientConfig {
  type: GradientType
  angle: number
  shape: RadialShape
  position: GradientPosition
  stops: ColorStop[]
}

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
