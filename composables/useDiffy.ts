import { diffLines, diffWords, diffChars, type Change } from 'diff'

export type DiffMode = 'lines' | 'words' | 'chars'

export const DIFF_MODES: DiffMode[] = ['lines', 'words', 'chars']

export interface DiffStats {
  added: number
  removed: number
  unchanged: number
}

export interface DiffOptions {
  ignoreCase: boolean
  ignoreWhitespace: boolean
}

export const useDiffy = () => {
  const compute = (
    a: string,
    b: string,
    mode: DiffMode,
    opts: DiffOptions,
  ): Change[] => {
    const options = {
      ignoreCase: opts.ignoreCase,
      ignoreWhitespace: opts.ignoreWhitespace,
    }
    if (mode === 'lines') {
      return diffLines(a, b, { ignoreWhitespace: opts.ignoreWhitespace })
    }
    if (mode === 'words') {
      return diffWords(a, b, options)
    }
    return diffChars(a, b, { ignoreCase: opts.ignoreCase })
  }

  const stats = (changes: Change[]): DiffStats => {
    let added = 0
    let removed = 0
    let unchanged = 0
    for (const change of changes) {
      const units = change.count ?? change.value.length
      if (change.added) added += units
      else if (change.removed) removed += units
      else unchanged += units
    }
    return { added, removed, unchanged }
  }

  return { compute, stats }
}
