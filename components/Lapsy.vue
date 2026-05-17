<script setup lang="ts">
const { t } = useI18n()
const { calendarDiff, totalsDiff } = useLapsy()

const pad = (n: number) => String(n).padStart(2, '0')
const toLocalInput = (d: Date): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`

const initialFrom = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
const fromInput = ref(toLocalInput(initialFrom))
const toInput = ref(toLocalInput(new Date()))
const useNow = ref(true)
const nowTick = ref(Date.now())

let intervalId: number | null = null
const startInterval = () => {
  stopInterval()
  intervalId = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
}
const stopInterval = () => {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

onMounted(() => {
  if (useNow.value) startInterval()
})
onBeforeUnmount(stopInterval)

watch(useNow, (val) => {
  if (val) {
    nowTick.value = Date.now()
    startInterval()
  } else {
    stopInterval()
    toInput.value = toLocalInput(new Date())
  }
})

const fromDate = computed<Date | null>(() => {
  const d = new Date(fromInput.value)
  return Number.isNaN(d.getTime()) ? null : d
})

const toDate = computed<Date | null>(() => {
  if (useNow.value) {
    nowTick.value
    return new Date()
  }
  const d = new Date(toInput.value)
  return Number.isNaN(d.getTime()) ? null : d
})

const diff = computed(() => {
  if (!fromDate.value || !toDate.value) return null
  return calendarDiff(fromDate.value, toDate.value)
})

const totals = computed(() => {
  if (!fromDate.value || !toDate.value) return null
  return totalsDiff(fromDate.value, toDate.value)
})

const breakdownText = computed(() => {
  const d = diff.value
  if (!d) return ''
  const parts: string[] = []
  if (d.years) parts.push(`${d.years} ${t('lapsy.units.years')}`)
  if (d.months) parts.push(`${d.months} ${t('lapsy.units.months')}`)
  if (d.days) parts.push(`${d.days} ${t('lapsy.units.days')}`)
  if (d.hours) parts.push(`${d.hours} ${t('lapsy.units.hours')}`)
  if (d.minutes) parts.push(`${d.minutes} ${t('lapsy.units.minutes')}`)
  parts.push(`${d.seconds} ${t('lapsy.units.seconds')}`)
  return parts.join(', ')
})

const statusKey = computed(() => {
  const d = diff.value
  if (!d) return ''
  const isZero =
    d.years === 0 &&
    d.months === 0 &&
    d.days === 0 &&
    d.hours === 0 &&
    d.minutes === 0 &&
    d.seconds === 0
  if (isZero) return 'lapsy.status.same'
  return d.negative ? 'lapsy.status.future' : 'lapsy.status.past'
})

const formatNumber = (n: number): string => n.toLocaleString()

const swap = () => {
  if (useNow.value) {
    useNow.value = false
    toInput.value = toLocalInput(new Date())
    nextTick(() => {
      const tmp = fromInput.value
      fromInput.value = toInput.value
      toInput.value = tmp
    })
    return
  }
  const tmp = fromInput.value
  fromInput.value = toInput.value
  toInput.value = tmp
}

const setFromNow = () => {
  fromInput.value = toLocalInput(new Date())
}

const setToNow = () => {
  useNow.value = false
  toInput.value = toLocalInput(new Date())
}
</script>

<template>
  <div class="lapsy">
    <div class="card">
      <div class="row">
        <label class="field grow">
          <span>{{ t('lapsy.from') }}</span>
          <input v-model="fromInput" type="datetime-local" />
        </label>
        <button class="btn btn-ghost btn-sm self-end" type="button" @click="setFromNow">
          {{ t('lapsy.actions.now') }}
        </button>
      </div>

      <label class="chk">
        <input v-model="useNow" type="checkbox" />
        <span>{{ t('lapsy.useNow') }}</span>
      </label>

      <div v-if="!useNow" class="row">
        <label class="field grow">
          <span>{{ t('lapsy.to') }}</span>
          <input v-model="toInput" type="datetime-local" />
        </label>
        <button class="btn btn-ghost btn-sm self-end" type="button" @click="setToNow">
          {{ t('lapsy.actions.now') }}
        </button>
      </div>

      <div class="actions">
        <button class="btn btn-ghost btn-sm" type="button" @click="swap">
          ↕ {{ t('lapsy.actions.swap') }}
        </button>
      </div>
    </div>

    <div v-if="diff && totals" class="card result">
      <div class="status" :class="`status-${statusKey.split('.').pop()}`">
        {{ t(statusKey, { text: breakdownText }) }}
      </div>

      <div>
        <h3 class="block-title">{{ t('lapsy.breakdown') }}</h3>
        <div class="breakdown">
          <div class="unit-cell">
            <span class="num">{{ diff.years }}</span>
            <span class="lbl">{{ t('lapsy.units.years') }}</span>
          </div>
          <div class="unit-cell">
            <span class="num">{{ diff.months }}</span>
            <span class="lbl">{{ t('lapsy.units.months') }}</span>
          </div>
          <div class="unit-cell">
            <span class="num">{{ diff.days }}</span>
            <span class="lbl">{{ t('lapsy.units.days') }}</span>
          </div>
          <div class="unit-cell">
            <span class="num">{{ diff.hours }}</span>
            <span class="lbl">{{ t('lapsy.units.hours') }}</span>
          </div>
          <div class="unit-cell">
            <span class="num">{{ diff.minutes }}</span>
            <span class="lbl">{{ t('lapsy.units.minutes') }}</span>
          </div>
          <div class="unit-cell">
            <span class="num">{{ diff.seconds }}</span>
            <span class="lbl">{{ t('lapsy.units.seconds') }}</span>
          </div>
        </div>
      </div>

      <div>
        <h3 class="block-title">{{ t('lapsy.totals.title') }}</h3>
        <ul class="totals">
          <li>
            <span class="total-label">{{ t('lapsy.totals.days') }}</span>
            <strong class="mono">{{ formatNumber(totals.days) }}</strong>
          </li>
          <li>
            <span class="total-label">{{ t('lapsy.totals.hours') }}</span>
            <strong class="mono">{{ formatNumber(totals.hours) }}</strong>
          </li>
          <li>
            <span class="total-label">{{ t('lapsy.totals.minutes') }}</span>
            <strong class="mono">{{ formatNumber(totals.minutes) }}</strong>
          </li>
          <li>
            <span class="total-label">{{ t('lapsy.totals.seconds') }}</span>
            <strong class="mono">{{ formatNumber(totals.seconds) }}</strong>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lapsy {
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
.row {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field.grow {
  flex: 1 1 220px;
}
.field input {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.self-end {
  align-self: flex-end;
}
.chk {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}
.actions {
  display: flex;
  justify-content: flex-end;
}
.result {
  gap: 1.1rem;
}
.status {
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: var(--bg, #fff);
  font-size: 0.95rem;
}
.status-past {
  background: #f0f7ee;
  border-color: #cfe3c7;
  color: #2b5c1c;
}
.status-future {
  background: #fbf8e8;
  border-color: #ebe3a1;
  color: #6e5a00;
}
.status-same {
  background: var(--surface);
  color: var(--muted);
}
.block-title {
  margin: 0 0 0.5rem;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}
.breakdown {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.4rem;
}
.unit-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.5rem 0.4rem;
  gap: 0.15rem;
}
.num {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 600;
  font-size: 1.3rem;
}
.lbl {
  font-size: 0.72rem;
  color: var(--muted);
}
.totals {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.totals li {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.45rem 0.6rem;
}
.total-label {
  font-size: 0.85rem;
  color: var(--muted);
  text-transform: capitalize;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
