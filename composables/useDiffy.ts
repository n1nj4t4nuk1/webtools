/**
 * useDiffy
 *
 * Composable powering the Diffy tool: thin wrapper around the `diff`
 * library to compute the differences between two texts at three
 * granularities (lines, words or characters) and to summarise the
 * result as added / removed / unchanged unit counts.
 */
import { diffLines, diffWords, diffChars, type Change } from 'diff'

/** Granularity at which two texts are compared. */
export type DiffMode = 'lines' | 'words' | 'chars'

export const DIFF_MODES: DiffMode[] = ['lines', 'words', 'chars']

/** Summary counters returned by {@link useDiffy.stats}. */
export interface DiffStats {
  added: number
  removed: number
  unchanged: number
}

/** Options passed to the underlying `diff` algorithms. */
export interface DiffOptions {
  ignoreCase: boolean
  ignoreWhitespace: boolean
}

export const useDiffy = () => {
  /**
   * Compute the diff between two strings. The `ignoreCase` and
   * `ignoreWhitespace` flags are forwarded to whichever algorithm
   * supports them — line diffs accept `ignoreWhitespace`, char diffs
   * accept `ignoreCase`, word diffs accept both.
   */
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

  /**
   * Reduce a list of `Change`s to added / removed / unchanged totals.
   * Uses `change.count` when available (line/word diffs) and falls back
   * to the raw value length (char diffs).
   */
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
