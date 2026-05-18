/**
 * useCombiny
 *
 * Composable powering the Combiny tool: generates string combinations
 * from a list of named fields. Each field has a value (e.g. "John") and
 * a mode that decides which tokens it contributes:
 *
 * - `full`    → the whole value, lowercased ("john").
 * - `initial` → just the first character ("j").
 * - `both`    → both ("john" and "j"), as long as the value has >1 char.
 *
 * The cartesian product of the chosen tokens is then optionally
 * permuted (every ordering of the fields) and optionally enumerated
 * across every non-empty subset of fields. The result is a sorted,
 * de-duplicated list of strings prefixed/suffixed/separated as
 * configured.
 */

/** Token-selection mode for a single field. */
export type FieldMode = 'full' | 'initial' | 'both'

/** One input row in the Combiny UI. */
export interface CombinyField {
  id: string
  value: string
  mode: FieldMode
}

/** Generation options driving {@link useCombiny.generate}. */
export interface CombinyOptions {
  fields: CombinyField[]
  separator: string
  prefix: string
  suffix: string
  /** Emit every ordering of the chosen fields, not just the original one. */
  permuteOrder: boolean
  /** Also emit combinations that use only a subset of the fields. */
  includeSubsets: boolean
}

/** Final output of {@link useCombiny.generate}. */
export interface CombinyResult {
  combinations: string[]
  /** Number of distinct combinations produced before the cap was applied. */
  totalGenerated: number
}

/** Hard cap on returned results, to keep the UI responsive. */
export const MAX_RESULTS = 2000

/**
 * Compute the token list for a single field based on its mode. Empty
 * fields produce an empty list so the caller can skip them; "initial"
 * and "both" both fall back to a single token when the value is 1 char
 * long (because "John" + initial of "John" = "j", but "J" alone yields
 * just "j").
 */
const tokensFor = (field: CombinyField): string[] => {
  const v = field.value.trim().toLowerCase()
  if (v.length === 0) return []
  if (field.mode === 'full') return [v]
  if (field.mode === 'initial') return [v[0]]
  return v.length > 1 ? [v, v[0]] : [v]
}

/** All orderings (n!) of an array. Recursive, only used on small inputs. */
const permutations = <T>(arr: T[]): T[][] => {
  if (arr.length <= 1) return [arr.slice()]
  const result: T[][] = []
  for (let i = 0; i < arr.length; i++) {
    const rest = [...arr.slice(0, i), ...arr.slice(i + 1)]
    for (const perm of permutations(rest)) {
      result.push([arr[i], ...perm])
    }
  }
  return result
}

/** Cartesian product of a list of lists. Empty input returns `[[]]`. */
const cartesian = (lists: string[][]): string[][] => {
  if (lists.length === 0) return [[]]
  return lists.reduce<string[][]>(
    (acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])),
    [[]],
  )
}

/** Every non-empty subset of `arr`. 2^n subsets in total, minus the empty one. */
const nonEmptySubsets = <T>(arr: T[]): T[][] => {
  const result: T[][] = [[]]
  for (const item of arr) {
    const len = result.length
    for (let i = 0; i < len; i++) {
      result.push([...result[i], item])
    }
  }
  return result.filter((s) => s.length > 0)
}

export const useCombiny = () => {
  /**
   * Produce the combination list for the given options. The hard cap on
   * results applies to the *output*; an internal generation cap of
   * `maxResults * 4` is used to bail out of pathological inputs early
   * (e.g. five fields with permuteOrder + includeSubsets).
   */
  const generate = (
    opts: CombinyOptions,
    maxResults: number = MAX_RESULTS,
  ): CombinyResult => {
    const active = opts.fields.filter((f) => f.value.trim().length > 0)
    if (active.length === 0) {
      return { combinations: [], totalGenerated: 0 }
    }

    const baseGroups = opts.includeSubsets ? nonEmptySubsets(active) : [active]
    const seen = new Set<string>()
    const cap = Math.max(maxResults * 4, MAX_RESULTS * 4)

    outer: for (const group of baseGroups) {
      const orderings = opts.permuteOrder ? permutations(group) : [group]
      for (const ordering of orderings) {
        const tokenLists = ordering.map(tokensFor)
        if (tokenLists.some((l) => l.length === 0)) continue
        for (const tokens of cartesian(tokenLists)) {
          seen.add(opts.prefix + tokens.join(opts.separator) + opts.suffix)
          if (seen.size >= cap) break outer
        }
      }
    }

    const all = [...seen].sort()
    return {
      combinations: all.slice(0, maxResults),
      totalGenerated: all.length,
    }
  }

  return { generate }
}
