/**
 * useYieldy
 *
 * Composable powering the Yieldy tool: compound interest calculator
 * with optional periodic contributions and a year-by-year breakdown.
 *
 * Math:
 *   balance ← principal
 *   for each period (years × periodsPerYear):
 *     balance += balance × (annualRate / periodsPerYear)
 *     balance += contribution (added at end of period)
 *
 * The iterative form is used instead of the closed-form annuity
 * formula so we can sample intermediate snapshots and so users can
 * read off the running interest accumulated each year. The cost is
 * negligible — worst case ~18k iterations for 50y × 365d.
 */

/** How often interest is compounded — also how often contributions land. */
export type Frequency =
  | 'annually'
  | 'semiAnnually'
  | 'quarterly'
  | 'monthly'
  | 'weekly'
  | 'daily'

/** All frequencies in display order with their periods-per-year multiplier. */
export const FREQUENCIES: { id: Frequency; perYear: number }[] = [
  { id: 'annually', perYear: 1 },
  { id: 'semiAnnually', perYear: 2 },
  { id: 'quarterly', perYear: 4 },
  { id: 'monthly', perYear: 12 },
  { id: 'weekly', perYear: 52 },
  { id: 'daily', perYear: 365 },
]

/** Currency presets — purely cosmetic, used by the UI for formatting. */
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'MXN', 'BRL'] as const
export type Currency = (typeof CURRENCIES)[number]

/** Input options for {@link useYieldy.compute}. */
export interface YieldyOptions {
  principal: number
  /** Nominal annual interest rate, as a percentage (e.g. `5` for 5%). */
  annualRatePct: number
  years: number
  frequency: Frequency
  /** Amount added at the end of every compounding period. May be 0. */
  contribution: number
}

/** One row of the yearly breakdown table. */
export interface YearRow {
  year: number
  balance: number
  contributed: number
  interest: number
}

/** Full output of {@link useYieldy.compute}. */
export interface YieldyResult {
  finalBalance: number
  totalContributed: number
  totalInterest: number
  rows: YearRow[]
}

/** Look up the periods-per-year for a frequency id. */
const periodsPerYear = (f: Frequency): number =>
  FREQUENCIES.find((p) => p.id === f)?.perYear ?? 1

export const useYieldy = () => {
  /**
   * Simulate the compound-interest growth period by period. Returns the
   * final balance, the total amount put in (initial + every recurring
   * contribution), the interest earned (final − totalContributed) and
   * a row per completed year for the breakdown table.
   */
  const compute = (opts: YieldyOptions): YieldyResult => {
    const principal = Math.max(0, opts.principal)
    const r = Math.max(0, opts.annualRatePct) / 100
    const years = Math.max(0, Math.min(200, Math.floor(opts.years)))
    const pY = periodsPerYear(opts.frequency)
    const periodRate = r / pY
    const contribution = Math.max(0, opts.contribution)

    let balance = principal
    let contributed = principal
    const rows: YearRow[] = []
    rows.push({ year: 0, balance, contributed, interest: 0 })

    for (let y = 1; y <= years; y++) {
      for (let p = 0; p < pY; p++) {
        balance += balance * periodRate
        balance += contribution
        contributed += contribution
      }
      rows.push({
        year: y,
        balance,
        contributed,
        interest: balance - contributed,
      })
    }

    return {
      finalBalance: balance,
      totalContributed: contributed,
      totalInterest: balance - contributed,
      rows,
    }
  }

  /**
   * Format `value` as a localized currency string. Centralised here so
   * the component and any future export use the same formatting.
   */
  const formatCurrency = (
    value: number,
    currency: Currency,
    locale: string,
  ): string => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  }

  return { compute, formatCurrency }
}
