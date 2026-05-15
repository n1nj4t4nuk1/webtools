import piexif from 'piexifjs'

export type ExifIfdName = '0th' | 'Exif' | 'GPS' | 'Interop' | '1st'

export interface ExifTagDef {
  ifd: ExifIfdName
  id: number
  name: string
  type: string
}

export interface ExifTag extends ExifTagDef {
  value: unknown
  display: string
  editable: boolean
}

const IFD_ORDER: ExifIfdName[] = ['0th', 'Exif', 'GPS', 'Interop', '1st']

const NUMERIC_TYPES = new Set([
  'Byte',
  'Short',
  'Long',
  'SByte',
  'SShort',
  'SLong',
  'Float',
  'DFloat',
])

const RATIONAL_TYPES = new Set(['Rational', 'SRational'])

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsDataURL(file)
  })

const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = header.match(/data:([^;]+)/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

const tagDefs = (): Record<ExifIfdName, Record<number, { name: string; type: string }>> => {
  const tags = (piexif as unknown as {
    TAGS: Record<ExifIfdName, Record<number, { name: string; type: string }>>
  }).TAGS
  return tags
}

const lookupDef = (
  ifd: ExifIfdName,
  id: number,
): { name: string; type: string } => {
  const entry = tagDefs()[ifd]?.[id]
  if (entry) return entry
  return { name: `Tag${id}`, type: 'Undefined' }
}

const isPrintableAscii = (s: string) =>
  // accept printable ASCII + common whitespace
  /^[\x20-\x7E\n\r\t]*$/.test(s)

const isRationalPair = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number'

const formatRational = ([n, d]: [number, number]) =>
  d === 0 ? '0' : Number.isInteger(n / d) ? String(n / d) : (n / d).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')

const formatValue = (value: unknown, type: string): { display: string; editable: boolean } => {
  if (value == null) return { display: '', editable: true }

  if (type === 'Ascii') {
    return { display: String(value), editable: true }
  }

  if (RATIONAL_TYPES.has(type)) {
    if (Array.isArray(value) && value.length > 0 && Array.isArray(value[0])) {
      const arr = value as [number, number][]
      return { display: arr.map(formatRational).join(', '), editable: true }
    }
    if (isRationalPair(value)) {
      return { display: formatRational(value), editable: true }
    }
  }

  if (NUMERIC_TYPES.has(type)) {
    if (Array.isArray(value)) {
      return { display: value.join(', '), editable: true }
    }
    return { display: String(value), editable: true }
  }

  // Undefined / Byte binarios
  if (typeof value === 'string') {
    if (isPrintableAscii(value) && value.length < 200) {
      return { display: value, editable: true }
    }
    const bytes = Array.from(value).slice(0, 16).map((c) => c.charCodeAt(0).toString(16).padStart(2, '0'))
    const hex = bytes.join(' ')
    return {
      display: `<${value.length} bytes: ${hex}${value.length > 16 ? '…' : ''}>`,
      editable: false,
    }
  }

  if (Array.isArray(value)) {
    return { display: value.join(', '), editable: false }
  }

  return { display: String(value), editable: false }
}

const toRational = (n: number): [number, number] => {
  if (!Number.isFinite(n)) return [0, 1]
  if (Number.isInteger(n)) return [n, 1]
  const denom = 1000000
  return [Math.round(n * denom), denom]
}

const parseValue = (input: string, type: string): unknown => {
  if (type === 'Ascii') return input

  if (RATIONAL_TYPES.has(type)) {
    const parts = input.split(',').map((s) => s.trim()).filter(Boolean)
    const rationals = parts.map((p) => toRational(Number(p)))
    return rationals.length > 1 ? rationals : rationals[0]
  }

  if (NUMERIC_TYPES.has(type)) {
    const parts = input.split(',').map((s) => s.trim()).filter(Boolean)
    const nums = parts.map((p) => Number(p))
    if (nums.some((n) => !Number.isFinite(n))) {
      throw new Error('invalid-number')
    }
    return nums.length > 1 ? nums : nums[0]
  }

  // Undefined / unknown — pass through as string
  return input
}

export const useExif = () => {
  const isJpeg = (file: File) =>
    file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)

  const read = async (file: File): Promise<ExifTag[]> => {
    if (!isJpeg(file)) throw new Error('not-jpeg')
    const dataUrl = await fileToDataUrl(file)
    const exif = piexif.load(dataUrl) as Record<ExifIfdName, Record<number, unknown>>

    const tags: ExifTag[] = []
    for (const ifd of IFD_ORDER) {
      const block = exif[ifd]
      if (!block) continue
      for (const idStr of Object.keys(block)) {
        const id = Number(idStr)
        const def = lookupDef(ifd, id)
        const value = block[id]
        const formatted = formatValue(value, def.type)
        tags.push({
          ifd,
          id,
          name: def.name,
          type: def.type,
          value,
          display: formatted.display,
          editable: formatted.editable,
        })
      }
    }
    return tags
  }

  const write = async (file: File, tags: ExifTag[]): Promise<Blob> => {
    if (!isJpeg(file)) throw new Error('not-jpeg')
    const dataUrl = await fileToDataUrl(file)

    const exifObj: Record<ExifIfdName, Record<number, unknown>> & {
      thumbnail: string | null
    } = {
      '0th': {},
      Exif: {},
      GPS: {},
      Interop: {},
      '1st': {},
      thumbnail: null,
    }

    for (const tag of tags) {
      let value = tag.value
      if (tag.editable) {
        try {
          value = parseValue(tag.display, tag.type)
        } catch {
          throw new Error(`invalid-value:${tag.name}`)
        }
      }
      exifObj[tag.ifd][tag.id] = value
    }

    const exifBytes = piexif.dump(exifObj)
    const cleanedDataUrl = piexif.remove(dataUrl)
    const newDataUrl = piexif.insert(exifBytes, cleanedDataUrl)
    return dataUrlToBlob(newDataUrl)
  }

  const strip = async (file: File): Promise<Blob> => {
    if (!isJpeg(file)) throw new Error('not-jpeg')
    const dataUrl = await fileToDataUrl(file)
    const cleanedDataUrl = piexif.remove(dataUrl)
    return dataUrlToBlob(cleanedDataUrl)
  }

  const allDefinedTags = (): ExifTagDef[] => {
    const defs = tagDefs()
    const out: ExifTagDef[] = []
    for (const ifd of IFD_ORDER) {
      const block = defs[ifd]
      if (!block) continue
      for (const idStr of Object.keys(block)) {
        const id = Number(idStr)
        const def = block[id]
        out.push({ ifd, id, name: def.name, type: def.type })
      }
    }
    return out.sort((a, b) =>
      a.ifd === b.ifd ? a.name.localeCompare(b.name) : IFD_ORDER.indexOf(a.ifd) - IFD_ORDER.indexOf(b.ifd),
    )
  }

  const newTagFromDef = (def: ExifTagDef): ExifTag => ({
    ...def,
    value: '',
    display: '',
    editable: true,
  })

  return { read, write, strip, allDefinedTags, newTagFromDef }
}
