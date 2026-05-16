export interface RegexMatch {
  index: number
  length: number
  text: string
  groups: string[]
}

export interface RegexResult {
  regex: RegExp | null
  error: string | null
}

export const useRegexpad = () => {
  const buildRegex = (pattern: string, flags: string): RegexResult => {
    if (pattern.length === 0) return { regex: null, error: null }
    try {
      return { regex: new RegExp(pattern, flags), error: null }
    } catch (err) {
      return { regex: null, error: (err as Error).message }
    }
  }

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

  const escapeHtml = (s: string): string =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

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
