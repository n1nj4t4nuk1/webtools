/**
 * useUrlpad
 *
 * Composable powering the Urlpad tool: thin wrapper over JavaScript's
 * URL-encoding helpers. The user picks between the strict `component`
 * variant (`encodeURIComponent` / `decodeURIComponent`) and the looser
 * `uri` variant (`encodeURI` / `decodeURI`), and either lets the tool
 * auto-detect whether the input is encoded already or chooses
 * explicitly.
 *
 * Auto-detection looks for any `%xx` triplet — a heuristic that works
 * well for real-world inputs without any heavy parsing.
 */

/** Whether to encode, decode, or auto-detect based on the input. */
export type UrlpadDirection = 'auto' | 'encode' | 'decode'

/** Component (`encodeURIComponent`) vs URI (`encodeURI`) flavor. */
export type UrlpadVariant = 'component' | 'uri'

/** Output of {@link useUrlpad.transform}. */
export interface UrlpadResult {
  output: string
  /** The direction that ended up being applied (after auto-detection). */
  effective: 'encode' | 'decode'
  error: string | null
}

export const useUrlpad = () => {
  /** True if the input contains at least one `%xx` percent-escape. */
  const detectDirection = (input: string): 'encode' | 'decode' => {
    return /%[0-9A-Fa-f]{2}/.test(input) ? 'decode' : 'encode'
  }

  /**
   * Apply the requested transform. Empty input short-circuits to an
   * empty result with `effective: 'encode'`. Throws from the native
   * encoders (most commonly malformed `%` sequences during decode) are
   * caught and surfaced as `error`.
   */
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
