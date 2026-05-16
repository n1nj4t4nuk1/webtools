export type UrlpadDirection = 'auto' | 'encode' | 'decode'
export type UrlpadVariant = 'component' | 'uri'

export interface UrlpadResult {
  output: string
  effective: 'encode' | 'decode'
  error: string | null
}

export const useUrlpad = () => {
  const detectDirection = (input: string): 'encode' | 'decode' => {
    return /%[0-9A-Fa-f]{2}/.test(input) ? 'decode' : 'encode'
  }

  const transform = (
    input: string,
    direction: UrlpadDirection,
    variant: UrlpadVariant,
  ): UrlpadResult => {
    if (input.length === 0) return { output: '', effective: 'encode', error: null }
    const effective = direction === 'auto' ? detectDirection(input) : direction
    try {
      if (effective === 'encode') {
        const output =
          variant === 'component' ? encodeURIComponent(input) : encodeURI(input)
        return { output, effective: 'encode', error: null }
      }
      const output =
        variant === 'component' ? decodeURIComponent(input) : decodeURI(input)
      return { output, effective: 'decode', error: null }
    } catch (err) {
      return { output: '', effective, error: (err as Error).message }
    }
  }

  return { detectDirection, transform }
}
