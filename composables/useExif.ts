/**
 * useExif
 *
 * Composable powering the Metaimg tool: reads, edits, strips and adds
 * EXIF metadata in JPEG files using `piexifjs`. Tag values are exposed
 * to the UI in a friendlier shape than piexif's raw output:
 *
 * - Numeric values are stringified for editing.
 * - Rationals (`[numerator, denominator]`) are rendered as decimals.
 * - Binary `Undefined` tags that happen to be printable ASCII are
 *   shown verbatim; truly binary blobs are displayed as a hex preview
 *   and marked non-editable so the user doesn't corrupt them.
 *
 * On write the same `display` strings are parsed back to the type the
 * tag expects, and the resulting bytes are merged back into the JPEG.
 */
import piexif from 'piexifjs'

/** EXIF IFD (Image File Directory) name as understood by piexif. */
export type ExifIfdName = '0th' | 'Exif' | 'GPS' | 'Interop' | '1st'

/** Static description of a known EXIF tag (no value). */
export interface ExifTagDef {
  ifd: ExifIfdName
  id: number
  name: string
  type: string
}

/** A tag with its current value and display-ready representation. */
export interface ExifTag extends ExifTagDef {
  value: unknown
  display: string
  editable: boolean
}

/** Canonical order of IFDs when listing tags. */
const IFD_ORDER: ExifIfdName[] = ['0th', 'Exif', 'GPS', 'Interop', '1st']

/** EXIF types that map to single numeric values (or arrays of them). */
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

/** Rational types are stored as `[numerator, denominator]` pairs. */
const RATIONAL_TYPES = new Set(['Rational', 'SRational'])

/** Read `file` into a `data:image/jpeg;base64,…` URL, as piexif expects. */
const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
    reader.readAsDataURL(file)
  })

/** Inverse of {@link fileToDataUrl}: decode a data URL back into a `Blob`. */
const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = header.match(/data:([^;]+)/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/** Access piexif's tag dictionary with a sane TypeScript shape. */
const tagDefs = (): Record<ExifIfdName, Record<number, { name: string; type: string }>> => {
  const tags = (piexif as unknown as {
    TAGS: Record<ExifIfdName, Record<number, { name: string; type: string }>>
  }).TAGS
  return tags
}

/** Look up a tag definition by IFD + numeric ID, with a fallback. */
const lookupDef = (
  ifd: ExifIfdName,
  id: number,
): { name: string; type: string } => {
  const entry = tagDefs()[ifd]?.[id]
  if (entry) return entry
  return { name: `Tag${id}`, type: 'Undefined' }
}

/** Accept printable ASCII plus the usual whitespace characters. */
const isPrintableAscii = (s: string) =>
  /^[\x20-\x7E\n\r\t]*$/.test(s)

/** Type guard for a `[number, number]` tuple. */
const isRationalPair = (v: unknown): v is [number, number] =>
  Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number'

/**
 * Render a single rational as a decimal, trimming trailing zeros and
 * collapsing whole numbers to integers when possible.
 */
const formatRational = ([n, d]: [number, number]) =>
  d === 0 ? '0' : Number.isInteger(n / d) ? String(n / d) : (n / d).toFixed(4).replace(/0+$/, '').replace(/\.$/, '')

/**
 * Produce the `{ display, editable }` pair for a tag value, based on
 * its EXIF type. Strings that look binary are surfaced as a hex
 * preview and marked non-editable so the UI hides the edit affordance.
 */
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

  // Binary Undefined / Byte blobs.
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

/** Round a decimal into a rational with a fixed million-step denominator. */
const toRational = (n: number): [number, number] => {
  if (!Number.isFinite(n)) return [0, 1]
  if (Number.isInteger(n)) return [n, 1]
  const denom = 1000000
  return [Math.round(n * denom), denom]
}

/**
 * Parse the edited `display` string back into the JS value the EXIF
 * type expects. Single values come out as a scalar; comma-separated
 * lists come out as arrays. Throws `invalid-number` if a numeric type
 * receives a non-numeric token.
 */
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

  // Undefined / unknown — pass through as string.
  return input
}

export const useExif = () => {
  /** True if the file looks like a JPEG (by MIME type or extension). */
  const isJpeg = (file: File) =>
    file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)

  /**
   * Read every defined tag from `file` into the UI-friendly `ExifTag`
   * shape. Throws `not-jpeg` if the file isn't a JPEG.
   */
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

  /**
   * Apply the user-edited `tags` to `file`, returning the new JPEG as a
   * Blob. Existing EXIF data is removed first, then the new payload is
   * inserted. Editable tags have their `display` re-parsed; non-editable
   * tags keep their original raw value.
   */
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

  /** Remove all EXIF data from `file`, returning a new Blob. */
  const strip = async (file: File): Promise<Blob> => {
    if (!isJpeg(file)) throw new Error('not-jpeg')
    const dataUrl = await fileToDataUrl(file)
    const cleanedDataUrl = piexif.remove(dataUrl)
    return dataUrlToBlob(cleanedDataUrl)
  }

  /**
   * Catalog of every standard EXIF tag piexif knows about, sorted by
   * IFD then alphabetically. Used to populate the "add tag" picker.
   */
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

  /** Build a blank `ExifTag` from a tag definition (for the add-tag form). */
  const newTagFromDef = (def: ExifTagDef): ExifTag => ({
    ...def,
    value: '',
    display: '',
    editable: true,
  })

  /** EXIF types the custom-tag form lets the user choose. */
  const customTagTypes = [
    'Ascii',
    'Short',
    'Long',
    'SShort',
    'SLong',
    'Rational',
    'SRational',
    'Undefined',
  ] as const

  /**
   * Create (and register in `piexif.TAGS`) a brand-new custom tag so
   * subsequent `piexif.dump` calls know how to serialise it. Throws
   * `invalid-id` if the EXIF tag ID is outside 1..65535.
   */
  const newCustomTag = (input: {
    ifd: ExifIfdName
    id: number
    type: (typeof customTagTypes)[number]
    name?: string
  }): ExifTag => {
    if (!Number.isInteger(input.id) || input.id < 1 || input.id > 65535) {
      throw new Error('invalid-id')
    }

    const defs = tagDefs()
    const existing = defs[input.ifd]?.[input.id]
    const name =
      existing?.name ??
      (input.name && input.name.trim()) ??
      `Custom${input.id}`
    const type = existing?.type ?? input.type

    if (!existing) {
      defs[input.ifd][input.id] = { name, type }
    }

    return {
      ifd: input.ifd,
      id: input.id,
      name,
      type,
      value: '',
      display: '',
      editable: true,
    }
  }

  return {
    read,
    write,
    strip,
    allDefinedTags,
    newTagFromDef,
    newCustomTag,
    customTagTypes,
  }
}
