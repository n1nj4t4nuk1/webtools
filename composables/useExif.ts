import piexif from 'piexifjs'

export interface ExifFields {
  make: string
  model: string
  software: string
  artist: string
  copyright: string
  imageDescription: string
  dateTime: string
  dateTimeOriginal: string
  lensModel: string
  orientation: number
}

const emptyFields = (): ExifFields => ({
  make: '',
  model: '',
  software: '',
  artist: '',
  copyright: '',
  imageDescription: '',
  dateTime: '',
  dateTimeOriginal: '',
  lensModel: '',
  orientation: 1,
})

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

const Image = piexif.ImageIFD
const Exif = piexif.ExifIFD

const readField = (
  ifd: Record<number, unknown> | undefined,
  tag: number,
): string => {
  if (!ifd) return ''
  const value = ifd[tag]
  return value == null ? '' : String(value)
}

export const useExif = () => {
  const isJpeg = (file: File) =>
    file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)

  const read = async (file: File): Promise<ExifFields> => {
    if (!isJpeg(file)) throw new Error('not-jpeg')
    const dataUrl = await fileToDataUrl(file)
    const exif = piexif.load(dataUrl)
    const zeroth = exif['0th'] as Record<number, unknown>
    const exifIfd = exif['Exif'] as Record<number, unknown>

    const orientationRaw = zeroth?.[Image.Orientation]
    const orientation =
      typeof orientationRaw === 'number' ? orientationRaw : 1

    return {
      make: readField(zeroth, Image.Make),
      model: readField(zeroth, Image.Model),
      software: readField(zeroth, Image.Software),
      artist: readField(zeroth, Image.Artist),
      copyright: readField(zeroth, Image.Copyright),
      imageDescription: readField(zeroth, Image.ImageDescription),
      dateTime: readField(zeroth, Image.DateTime),
      dateTimeOriginal: readField(exifIfd, Exif.DateTimeOriginal),
      lensModel: readField(exifIfd, Exif.LensModel),
      orientation,
    }
  }

  const write = async (file: File, fields: ExifFields): Promise<Blob> => {
    if (!isJpeg(file)) throw new Error('not-jpeg')
    const dataUrl = await fileToDataUrl(file)

    const zeroth: Record<number, unknown> = {}
    const exifIfd: Record<number, unknown> = {}

    if (fields.make) zeroth[Image.Make] = fields.make
    if (fields.model) zeroth[Image.Model] = fields.model
    if (fields.software) zeroth[Image.Software] = fields.software
    if (fields.artist) zeroth[Image.Artist] = fields.artist
    if (fields.copyright) zeroth[Image.Copyright] = fields.copyright
    if (fields.imageDescription)
      zeroth[Image.ImageDescription] = fields.imageDescription
    if (fields.dateTime) zeroth[Image.DateTime] = fields.dateTime
    if (fields.orientation && fields.orientation !== 1)
      zeroth[Image.Orientation] = fields.orientation
    if (fields.dateTimeOriginal)
      exifIfd[Exif.DateTimeOriginal] = fields.dateTimeOriginal
    if (fields.lensModel) exifIfd[Exif.LensModel] = fields.lensModel

    const exifObj = { '0th': zeroth, Exif: exifIfd, GPS: {}, Interop: {}, '1st': {}, thumbnail: null }
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

  return { read, write, strip, empty: emptyFields }
}
