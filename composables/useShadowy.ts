export interface Shadow {
  id: string
  x: number
  y: number
  blur: number
  spread: number
  color: string
  alpha: number
  inset: boolean
}

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n))

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return { r, g, b }
}

const formatColor = (hex: string, alpha: number): string => {
  const a = clamp(alpha, 0, 1)
  if (a >= 1) return hex
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
}

export const useShadowy = () => {
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
