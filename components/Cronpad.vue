<script setup lang="ts">
/**
 * Cronpad.vue
 *
 * Cron-expression editor with three live panels: a validity badge with an
 * error message, a human-readable description (shortcuts for the common
 * patterns, verbose field-by-field fallback otherwise) and a list of the
 * next 8 firing times rendered in the user's locale or UTC. `useCronpad`
 * supplies the AST, validation and next-runs iterator; the natural-language
 * formatting lives here so it can lean on `t()` for i18n.
 */
import type { Atom, FieldAst, FieldName, ParsedCron } from '~/composables/useCronpad'

const { t, locale } = useI18n()
const { parse, nextRuns } = useCronpad()

const expression = ref('0 */5 * * *')
const useUTC = ref(false)
const now = ref(new Date())

const parsed = computed(() => parse(expression.value))

const isList = (f: FieldAst): f is { kind: 'list'; items: Atom[] } => f.kind === 'list'

const fieldRanges: Record<FieldName, { min: number; max: number }> = {
  minute: { min: 0, max: 59 },
  hour: { min: 0, max: 23 },
  dom: { min: 1, max: 31 },
  month: { min: 1, max: 12 },
  dow: { min: 0, max: 6 },
}

const fieldIsStar = (f: FieldAst): boolean => f.kind === 'star'

const fieldSingleValue = (f: FieldAst): number | null => {
  if (f.kind === 'value') return f.n
  return null
}

const fieldStarStep = (f: FieldAst): number | null => {
  if (f.kind === 'step' && f.base.kind === 'star') return f.step
  return null
}

const fieldRange = (f: FieldAst): { from: number; to: number } | null => {
  if (f.kind === 'range') return { from: f.from, to: f.to }
  return null
}

const formatList = (items: (number | string)[]): string => {
  if (items.length <= 1) return items.join('')
  const head = items.slice(0, -1).join(', ')
  return `${head} ${t('cronpad.and')} ${items[items.length - 1]}`
}

const dowName = (n: number): string => t(`cronpad.dow.${n}`)
const monthName = (n: number): string => t(`cronpad.month.${n}`)

const formatTime = (h: number, m: number): string =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

const fieldPhrase = (f: FieldAst, kind: FieldName): string => {
  if (f.kind === 'star') return t(`cronpad.field.${kind}.every`)
  if (f.kind === 'value') {
    if (kind === 'dow') return t('cronpad.field.dow.value', { name: dowName(f.n) })
    if (kind === 'month') return t('cronpad.field.month.value', { name: monthName(f.n) })
    return t(`cronpad.field.${kind}.value`, { n: f.n })
  }
  if (f.kind === 'range') {
    if (kind === 'dow')
      return t('cronpad.field.dow.range', { from: dowName(f.from), to: dowName(f.to) })
    if (kind === 'month')
      return t('cronpad.field.month.range', { from: monthName(f.from), to: monthName(f.to) })
    return t(`cronpad.field.${kind}.range`, { from: f.from, to: f.to })
  }
  if (f.kind === 'step') {
    if (f.base.kind === 'star')
      return t(`cronpad.field.${kind}.everyN`, { n: f.step })
    if (f.base.kind === 'range')
      return t(`cronpad.field.${kind}.rangeStep`, {
        step: f.step,
        from: f.base.from,
        to: f.base.to,
      })
    return t(`cronpad.field.${kind}.fromStep`, { step: f.step, from: f.base.n })
  }
  // list
  const allValues: number[] = []
  for (const a of f.items) {
    if (a.kind === 'value') allValues.push(a.n)
  }
  if (allValues.length === f.items.length) {
    if (kind === 'dow') return t('cronpad.field.dow.list', { list: formatList(allValues.map((n) => dowName(n))) })
    if (kind === 'month') return t('cronpad.field.month.list', { list: formatList(allValues.map((n) => monthName(n))) })
    return t(`cronpad.field.${kind}.list`, { list: formatList(allValues) })
  }
  // mixed list — join sub-phrases
  const phrases = f.items.map((a) => fieldPhrase(a, kind))
  return phrases.join(', ')
}

const describe = (p: ParsedCron): string => {
  const { minute, hour, dom, month, dow } = p.fields
  const mStar = fieldIsStar(minute)
  const hStar = fieldIsStar(hour)
  const dStar = fieldIsStar(dom)
  const moStar = fieldIsStar(month)
  const wStar = fieldIsStar(dow)
  const mSingle = fieldSingleValue(minute)
  const hSingle = fieldSingleValue(hour)
  const dSingle = fieldSingleValue(dom)
  const moSingle = fieldSingleValue(month)
  const wSingle = fieldSingleValue(dow)
  const mStarStep = fieldStarStep(minute)
  const hStarStep = fieldStarStep(hour)
  const wRange = fieldRange(dow)

  // Shortcuts
  if (mStar && hStar && dStar && moStar && wStar) return t('cronpad.desc.everyMinute')

  if (mStarStep !== null && hStar && dStar && moStar && wStar)
    return t('cronpad.desc.everyNMinutes', { n: mStarStep })

  if (mSingle === 0 && hStar && dStar && moStar && wStar) return t('cronpad.desc.everyHour')

  if (mSingle === 0 && hStarStep !== null && dStar && moStar && wStar)
    return t('cronpad.desc.everyNHours', { n: hStarStep })

  if (mSingle !== null && hStar && dStar && moStar && wStar)
    return t('cronpad.desc.everyHourAtMin', { m: mSingle })

  // Daily at HH:MM
  if (mSingle !== null && hSingle !== null && dStar && moStar && wStar)
    return t('cronpad.desc.dailyAt', { time: formatTime(hSingle, mSingle) })

  // Weekly single day at HH:MM
  if (mSingle !== null && hSingle !== null && dStar && moStar && wSingle !== null)
    return t('cronpad.desc.weeklyAt', {
      day: dowName(wSingle),
      time: formatTime(hSingle, mSingle),
    })

  // Weekdays / Weekends shortcuts
  if (
    mSingle !== null &&
    hSingle !== null &&
    dStar &&
    moStar &&
    wRange &&
    wRange.from === 1 &&
    wRange.to === 5
  )
    return t('cronpad.desc.weekdayAt', { time: formatTime(hSingle, mSingle) })

  // Day of month
  if (mSingle !== null && hSingle !== null && dSingle !== null && moStar && wStar)
    return t('cronpad.desc.onDomAt', {
      d: dSingle,
      time: formatTime(hSingle, mSingle),
    })

  // Yearly: specific date
  if (
    mSingle !== null &&
    hSingle !== null &&
    dSingle !== null &&
    moSingle !== null &&
    wStar
  )
    return t('cronpad.desc.onDateAt', {
      month: monthName(moSingle),
      d: dSingle,
      time: formatTime(hSingle, mSingle),
    })

  // Verbose fallback
  const parts: string[] = []
  parts.push(t('cronpad.desc.verbosePrefix', { phrase: fieldPhrase(minute, 'minute') }))
  if (!hStar) parts.push(fieldPhrase(hour, 'hour'))
  if (!dStar) parts.push(fieldPhrase(dom, 'dom'))
  if (!moStar) parts.push(fieldPhrase(month, 'month'))
  if (!wStar) parts.push(fieldPhrase(dow, 'dow'))
  return parts.join(', ')
}

const description = computed(() => {
  if (!parsed.value.valid) return ''
  return describe(parsed.value)
})

const errorMessage = computed(() => {
  if (parsed.value.valid) return ''
  const e = parsed.value.error
  if (e.code === 'empty') return ''
  if (e.code === 'field_count') return t('cronpad.errors.fieldCount')
  if (e.code === 'reboot_not_supported') return t('cronpad.errors.rebootUnsupported')
  if (e.code === 'empty_field')
    return t('cronpad.errors.emptyField', { field: t(`cronpad.fieldNames.${e.field}`) })
  if (e.code === 'invalid_step')
    return t('cronpad.errors.invalidStep', {
      field: t(`cronpad.fieldNames.${e.field}`),
      value: e.value ?? '',
    })
  if (e.code === 'invalid_range') {
    const r = fieldRanges[e.field as FieldName]
    return t('cronpad.errors.invalidRange', {
      field: t(`cronpad.fieldNames.${e.field}`),
      value: e.value ?? '',
      min: r.min,
      max: r.max,
    })
  }
  if (e.code === 'invalid_value') {
    const r = fieldRanges[e.field as FieldName]
    return t('cronpad.errors.invalidValue', {
      field: t(`cronpad.fieldNames.${e.field}`),
      value: e.value ?? '',
      min: r.min,
      max: r.max,
    })
  }
  return t('cronpad.errors.generic')
})

const upcoming = computed<Date[]>(() => {
  if (!parsed.value.valid) return []
  return nextRuns(parsed.value, now.value, 8)
})

const formatRun = (d: Date): string => {
  const opts: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    timeZone: useUTC.value ? 'UTC' : undefined,
    timeZoneName: useUTC.value ? 'short' : undefined,
  }
  return new Intl.DateTimeFormat(locale.value, opts).format(d)
}

let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  timer = setInterval(() => {
    now.value = new Date()
  }, 30_000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const examples: { expr: string; key: string }[] = [
  { expr: '*/5 * * * *', key: 'every5min' },
  { expr: '0 * * * *', key: 'hourly' },
  { expr: '0 9 * * 1-5', key: 'weekdays9' },
  { expr: '0 0 1 * *', key: 'monthFirst' },
  { expr: '@daily', key: 'preset' },
]

const useExample = (e: string) => {
  expression.value = e
}
</script>

<template>
  <div class="cronpad">
    <div class="card">
      <label class="field">
        <span>{{ t('cronpad.input.label') }}</span>
        <input
          v-model="expression"
          type="text"
          class="mono expr-input"
          spellcheck="false"
          autocomplete="off"
          :placeholder="t('cronpad.input.placeholder')"
        />
      </label>

      <div class="examples">
        <span class="examples-label">{{ t('cronpad.examples.label') }}</span>
        <button
          v-for="ex in examples"
          :key="ex.expr"
          type="button"
          class="example-chip mono"
          @click="useExample(ex.expr)"
        >
          {{ ex.expr }}
        </button>
      </div>
    </div>

    <div v-if="parsed.valid" class="card result">
      <div class="status status-ok">
        <span class="dot" />
        <span>{{ t('cronpad.validation.valid') }}</span>
      </div>
      <p class="description">{{ description }}</p>
      <p v-if="parsed.raw !== parsed.expanded" class="hint">
        {{ t('cronpad.expandedAs', { expr: parsed.expanded }) }}
      </p>
    </div>

    <div v-else-if="errorMessage" class="card result">
      <div class="status status-err">
        <span class="dot" />
        <span>{{ t('cronpad.validation.invalid') }}</span>
      </div>
      <p class="err-msg">{{ errorMessage }}</p>
    </div>

    <div v-if="parsed.valid && upcoming.length > 0" class="card">
      <header class="next-header">
        <h2>{{ t('cronpad.nextRuns.title') }}</h2>
        <label class="utc-toggle">
          <input v-model="useUTC" type="checkbox" />
          <span>{{ t('cronpad.nextRuns.useUTC') }}</span>
        </label>
      </header>
      <ol class="runs">
        <li v-for="(d, i) in upcoming" :key="i">
          <span class="run-index">{{ i + 1 }}.</span>
          <span class="run-date">{{ formatRun(d) }}</span>
        </li>
      </ol>
    </div>
  </div>
</template>

<style scoped>
.cronpad {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.expr-input {
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
  font-size: 1.05rem;
  letter-spacing: 0.04em;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}
.examples-label {
  font-size: 0.78rem;
  color: var(--muted);
  margin-right: 0.2rem;
}
.example-chip {
  padding: 0.25rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.12s;
}
.example-chip:hover {
  background: var(--surface);
}
.result {
  gap: 0.5rem;
}
.status {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.85rem;
  font-weight: 600;
}
.dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  display: inline-block;
}
.status-ok {
  color: #2f7a3a;
}
.status-ok .dot {
  background: #2f7a3a;
}
.status-err {
  color: #b53a1f;
}
.status-err .dot {
  background: #b53a1f;
}
.description {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.4;
}
.hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
}
.err-msg {
  margin: 0;
  color: #b53a1f;
}
.next-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.next-header h2 {
  margin: 0;
  font-size: 1rem;
}
.utc-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.85rem;
  color: var(--muted);
  cursor: pointer;
}
.runs {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.runs li {
  display: flex;
  gap: 0.6rem;
  align-items: baseline;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
}
.run-index {
  color: var(--muted);
  min-width: 1.6rem;
  text-align: right;
}
</style>
