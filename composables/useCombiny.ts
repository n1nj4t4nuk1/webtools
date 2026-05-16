export type FieldMode = 'full' | 'initial' | 'both'

export interface CombinyField {
  id: string
  value: string
  mode: FieldMode
}

export interface CombinyOptions {
  fields: CombinyField[]
  separator: string
  prefix: string
  suffix: string
  permuteOrder: boolean
  includeSubsets: boolean
}

export interface CombinyResult {
  combinations: string[]
  totalGenerated: number
}

export const MAX_RESULTS = 2000

const tokensFor = (field: CombinyField): string[] => {
  const v = field.value.trim().toLowerCase()
  if (v.length === 0) return []
  if (field.mode === 'full') return [v]
  if (field.mode === 'initial') return [v[0]]
  return v.length > 1 ? [v, v[0]] : [v]
}

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

const cartesian = (lists: string[][]): string[][] => {
  if (lists.length === 0) return [[]]
  return lists.reduce<string[][]>(
    (acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])),
    [[]],
  )
}

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
