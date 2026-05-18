/**
 * useLapsy
 *
 * Composable powering the Lapsy tool: computes the time between two
 * dates two complementary ways — as a calendar-style breakdown
 * (years/months/days/hours/minutes/seconds) and as absolute totals
 * (raw milliseconds and the larger units derived from them).
 *
 * The calendar diff uses borrowing logic identical to manual date
 * arithmetic, so e.g. (Feb 28 → Mar 1) returns "1 day", not "1 month
 * minus 27 days".
 */

/** Calendar-style breakdown returned by {@link useLapsy.calendarDiff}. */
export interface CalendarDiff {
  /** True if `a` is later than `b` (i.e. the diff is reversed). */
  negative: boolean
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

/** Raw totals (all positive) returned by {@link useLapsy.totalsDiff}. */
export interface TotalsDiff {
  ms: number
  seconds: number
  minutes: number
  hours: number
  days: number
}

export const useLapsy = () => {
  /**
   * Walk the calendar from the earlier date to the later one, borrowing
   * across unit boundaries (60s → 1min, 24h → 1d, days-in-previous-month
   * → 1m, etc.). The `negative` flag tells the UI which date came first.
   */
  const calendarDiff = (a: Date, b: Date): CalendarDiff => {
    const negative = a > b
    const from = negative ? new Date(b) : new Date(a)
    const to = negative ? new Date(a) : new Date(b)

    let years = to.getFullYear() - from.getFullYear()
    let months = to.getMonth() - from.getMonth()
    let days = to.getDate() - from.getDate()
    let hours = to.getHours() - from.getHours()
    let minutes = to.getMinutes() - from.getMinutes()
    let seconds = to.getSeconds() - from.getSeconds()

    if (seconds < 0) {
      minutes--
      seconds += 60
    }
    if (minutes < 0) {
      hours--
      minutes += 60
    }
    if (hours < 0) {
      days--
      hours += 24
    }
    if (days < 0) {
      const prevMonth = new Date(to.getFullYear(), to.getMonth(), 0)
      days += prevMonth.getDate()
      months--
    }
    if (months < 0) {
      years--
      months += 12
    }

    return { negative, years, months, days, hours, minutes, seconds }
  }

  /**
   * Absolute totals in five units. Always non-negative — sign-aware
   * presentation is left to the caller (which already knows from
   * {@link calendarDiff}'s `negative` flag).
   */
  const totalsDiff = (a: Date, b: Date): TotalsDiff => {
    const ms = Math.abs(b.getTime() - a.getTime())
    return {
      ms,
      seconds: Math.floor(ms / 1000),
      minutes: Math.floor(ms / 60000),
      hours: Math.floor(ms / 3600000),
      days: Math.floor(ms / 86400000),
    }
  }

  return { calendarDiff, totalsDiff }
}
