export interface CalendarDiff {
  negative: boolean
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
}

export interface TotalsDiff {
  ms: number
  seconds: number
  minutes: number
  hours: number
  days: number
}

export const useLapsy = () => {
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
