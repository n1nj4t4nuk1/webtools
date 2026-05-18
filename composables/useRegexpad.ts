/**
 * useRegexpad
 *
 * Composable powering the Regexpad tool: compiles a user-typed pattern
 * + flags into a `RegExp`, finds every match in a target string and
 * builds an HTML-safe highlight (`<mark>` around each match). Also
 * applies `String.prototype.replace` with the constructed regex so the
 * user can preview substitutions, including back-references like `$1`.
 */

/** One regex match with its position, length and captured groups. */
export interface RegexMatch {
  index: number
  length: number
  text: string
  /** Captured groups, in declaration order (no leading full-match entry). */
  groups: string[]
}

/** Output of {@link useRegexpad.buildRegex}. */
export interface RegexResult {
  regex: RegExp | null
  error: string | null
}

export const useRegexpad = () => {
  /**
   * Construct a `RegExp` from `pattern` + `flags`. An empty pattern
   * returns `{ regex: null, error: null }` so the UI doesn't show a
   * scary error before the user has typed anything.
   */
  const buildRegex = (pattern: string, flags: string): RegexResult => {
    if (pattern.length === 0) return { regex: null, error: null }
    try {
      return { regex: new RegExp(pattern, flags), error: null }
    } catch (err) {
      return { regex: null, error: (err as Error).message }
    }
  }

  /**
   * Find every match of `regex` inside `text`. Without the `g` flag we
   * return at most one match (matching JavaScript's `String.match`
   * semantics). With `g`, we cap the result at 10,000 matches and break
   * out on zero-length matches that don't advance, to avoid infinite
   * loops.
   */
  const findMatches = (text: string, regex: RegExp): RegexMatch[] => {
    const matches: RegexMatch[] = []
    if (!regex.global) {
      const m = text.match(regex)
      if (m && m.index !== undefined) {
        matches.push({
          index: m.index,
          length: m[0].length,
          text: m[0],
          groups: m.slice(1),
        })
      }
      return matches
    }
    let lastIndex = -1
    for (const m of text.matchAll(regex)) {
      if (m.index === undefined) continue
      matches.push({
        index: m.index,
        length: m[0].length,
        text: m[0],
        groups: m.slice(1),
      })
      if (m[0].length === 0 && m.index === lastIndex) break
      lastIndex = m.index
      if (matches.length > 10000) break
    }
    return matches
  }

  /** Replace the three HTML-sensitive characters with their entities. */
  const escapeHtml = (s: string): string =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

  /**
   * Build an HTML string that displays `text` with every match wrapped
   * in `<mark>`. Zero-length matches render as `∅` so they remain
   * visible. The output is safe to drop into `v-html` because
   * everything other than the `<mark>` tag is HTML-escaped first.
   */
  const buildHighlight = (text: string, matches: RegexMatch[]): string => {
    if (matches.length === 0) return escapeHtml(text) || '&nbsp;'
    let out = ''
    let cursor = 0
    for (const m of matches) {
      out += escapeHtml(text.slice(cursor, m.index))
      out +=
        '<mark>' +
        (m.length === 0 ? '∅' : escapeHtml(text.slice(m.index, m.index + m.length))) +
        '</mark>'
      cursor = m.index + m.length
    }
    out += escapeHtml(text.slice(cursor))
    return out
  }

  /**
   * Apply `regex.replace(text, replacement)`. Wraps the call so a
   * malformed replacement template doesn't crash the whole component.
   */
  const applyReplace = (
    text: string,
    regex: RegExp,
    replacement: string,
  ): { output: string; error: string | null } => {
    try {
      return { output: text.replace(regex, replacement), error: null }
    } catch (err) {
      return { output: '', error: (err as Error).message }
    }
  }

  return { buildRegex, findMatches, buildHighlight, applyReplace }
}
