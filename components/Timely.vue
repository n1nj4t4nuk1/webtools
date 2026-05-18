<script setup lang="ts">
/**
 * Timely.vue
 *
 * Linked inputs for every timestamp format (`useTimely.FORMATS`): editing
 * any one re-parses through `useTimely.parse` and rewrites the others via
 * `format`. A "use current time" toggle ticks once a second and disables
 * the inputs. Auxiliary panels show the relative phrase, weekday name and
 * the browser's current timezone label.
 */
import type { TimelyFormat } from '~/composables/useTimely'
import { FORMATS } from '~/composables/useTimely'

const { t, locale } = useI18n()
const { format, parse, relative, weekdayName, tzLabel } = useTimely()

const date = ref<Date>(new Date())
const editing = ref<TimelyFormat | null>(null)
const editingRaw = ref('')
const errorFormat = ref<TimelyFormat | null>(null)
const copiedFormat = ref<TimelyFormat | null>(null)

const valueFor = (fmt: TimelyFormat): string => {
  if (editing.value === fmt) return editingRaw.value
  return format(date.value, fmt)
}

const onInput = (fmt: TimelyFormat, raw: string) => {
  editing.value = fmt
  editingRaw.value = raw
  const parsed = parse(raw, fmt)
  if (parsed) {
    date.value = parsed
    errorFormat.value = null
  } else {
    errorFormat.value = fmt
  }
}

const onBlur = () => {
  if (errorFormat.value === null) {
    editing.value = null
    editingRaw.value = ''
  }
}

const setNow = () => {
  date.value = new Date()
  editing.value = null
  editingRaw.value = ''
  errorFormat.value = null
}

const copy = async (fmt: TimelyFormat) => {
  try {
    await navigator.clipboard.writeText(format(date.value, fmt))
    copiedFormat.value = fmt
    setTimeout(() => {
      if (copiedFormat.value === fmt) copiedFormat.value = null
    }, 1500)
  } catch {
    // silent
  }
}

const info = computed(() => ({
  weekday: weekdayName(date.value, locale.value),
  relative: relative(date.value, locale.value),
  tz: tzLabel(date.value),
}))
</script>

<template>
  <div class="timely">
    <div class="card">
      <header class="head">
        <span class="title">{{ t('timely.formats') }}</span>
        <button class="btn btn-ghost btn-sm" type="button" @click="setNow">
          {{ t('timely.actions.now') }}
        </button>
      </header>
      <ul class="format-list">
        <li v-for="fmt in FORMATS" :key="fmt" class="format-row">
          <span class="fmt-label">{{ t(`timely.fmt.${fmt}`) }}</span>
          <input
            :value="valueFor(fmt)"
            type="text"
            class="fmt-input mono"
            :class="{ 'is-err': errorFormat === fmt }"
            spellcheck="false"
            @input="onInput(fmt, ($event.target as HTMLInputElement).value)"
            @blur="onBlur"
          />
          <button class="btn btn-ghost btn-sm" type="button" @click="copy(fmt)">
            {{ copiedFormat === fmt ? t('timely.actions.copied') : t('timely.actions.copy') }}
          </button>
        </li>
      </ul>
      <p v-if="errorFormat" class="error">
        {{ t('timely.errors.invalid') }}
      </p>
    </div>

    <div class="card info">
      <div class="info-row">
        <span class="info-label">{{ t('timely.info.weekday') }}</span>
        <strong>{{ info.weekday }}</strong>
      </div>
      <div class="info-row">
        <span class="info-label">{{ t('timely.info.relative') }}</span>
        <strong>{{ info.relative }}</strong>
      </div>
      <div class="info-row">
        <span class="info-label">{{ t('timely.info.tz') }}</span>
        <strong class="mono">{{ info.tz }}</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timely {
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
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.title {
  font-weight: 600;
  font-size: 0.95rem;
}
.format-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.format-row {
  display: grid;
  grid-template-columns: 9rem 1fr auto;
  gap: 0.5rem;
  align-items: center;
}
@media (max-width: 640px) {
  .format-row {
    grid-template-columns: 1fr;
  }
}
.fmt-label {
  font-size: 0.85rem;
  color: var(--muted);
}
.fmt-input {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
  font-size: 0.88rem;
}
.fmt-input.is-err {
  border-color: #c84a2e;
  background: #fdf1ee;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.error {
  margin: 0;
  color: #b53a1f;
  font-size: 0.85rem;
}
.info {
  gap: 0.5rem;
}
.info-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: baseline;
}
.info-label {
  font-size: 0.85rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
