export interface Rgb { r: number; g: number; b: number }
export interface Hsl { h: number; s: number; l: number }

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n))

const pad2 = (n: number) => n.toString(16).padStart(2, '0')

export const hexToRgb = (hex: string): Rgb | null => {
  const m = hex.trim().match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i)
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

export const rgbToHex = ({ r, g, b }: Rgb): string =>
  `#${pad2(Math.round(r))}${pad2(Math.round(g))}${pad2(Math.round(b))}`

export const rgbToHsl = ({ r, g, b }: Rgb): Hsl => {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  const l = (max + min) / 2
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) }
}

export const hslToRgb = ({ h, s, l }: Hsl): Rgb => {
  const sn = s / 100
  const ln = l / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r1 = 0
  let g1 = 0
  let b1 = 0
  if (hp >= 0 && hp < 1) { r1 = c; g1 = x }
  else if (hp < 2) { r1 = x; g1 = c }
  else if (hp < 3) { g1 = c; b1 = x }
  else if (hp < 4) { g1 = x; b1 = c }
  else if (hp < 5) { r1 = x; b1 = c }
  else { r1 = c; b1 = x }
  const m = ln - c / 2
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  }
}

const linearize = (c: number): number => {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

export const relativeLuminance = ({ r, g, b }: Rgb): number =>
  0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)

export const contrastRatio = (a: Rgb, b: Rgb): number => {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la]
  return (lighter + 0.05) / (darker + 0.05)
}

export const generatePalette = (hex: string, count = 11): string[] => {
  const rgb = hexToRgb(hex)
  if (!rgb) return []
  const { h, s } = rgbToHsl(rgb)
  const palette: string[] = []
  for (let i = 0; i < count; i++) {
    const l = clamp(95 - i * (90 / (count - 1)), 5, 95)
    palette.push(rgbToHex(hslToRgb({ h, s, l })))
  }
  return palette
}

export const useColory = () => ({
  hexToRgb,
  rgbToHex,
  rgbToHsl,
  hslToRgb,
  relativeLuminance,
  contrastRatio,
  generatePalette,
})
