<script setup lang="ts">
/**
 * CsvJson.vue
 *
 * Two-pane editor (CSV ↔ JSON) that auto-detects which side the user just
 * edited (via `useCsvJson.detectFormat`) and converts to the other. Lets
 * the user override the delimiter and toggle whether the first CSV row is
 * a header. Errors from either parser are surfaced inline.
 */
import type { Delimiter } from '~/composables/useCsvJson'

const { t } = useI18n()
const { detectFormat, detectDelimiter, csvToJson, jsonToCsv } = useCsvJson()

type Direction = 'auto' | 'csv2json' | 'json2csv'
type DelimChoice = 'auto' | Delimiter

const input = ref('')
const direction = ref<Direction>('auto')
const delimChoice = ref<DelimChoice>('auto')
const hasHeader = ref(true)
const pretty = ref(true)
const copied = ref(false)

const detected = computed(() => detectFormat(input.value))

const resolvedDirection = computed<'csv2json' | 'json2csv' | 'idle'>(() => {
  if (direction.value === 'csv2json') return 'csv2json'
  if (direction.value === 'json2csv') return 'json2csv'
  if (detected.value === 'json') return 'json2csv'
  if (detected.value === 'csv') return 'csv2json'
  return 'idle'
})

const resolvedDelimiter = computed<Delimiter>(() => {
  if (delimChoice.value !== 'auto') return delimChoice.value
  return detectDelimiter(input.value)
})

const conversion = computed<{ output: string; error: string | null }>(() => {
  if (input.value.trim().length === 0) return { output: '', error: null }
  try {
    if (resolvedDirection.value === 'csv2json') {
      const data = csvToJson(input.value, resolvedDelimiter.value, hasHeader.value)
      return {
        output: JSON.stringify(data, null, pretty.value ? 2 : 0),
        error: null,
      }
    }
    if (resolvedDirection.value === 'json2csv') {
      return {
        output: jsonToCsv(input.value, resolvedDelimiter.value),
        error: null,
      }
    }
    return { output: '', error: t('csvjson.errors.unknownInput') }
  } catch (err) {
    const msg = (err as Error).message
    if (msg === 'NOT_TABULAR') return { output: '', error: t('csvjson.errors.notTabular') }
    if (msg === 'MIXED_SHAPE') return { output: '', error: t('csvjson.errors.mixedShape') }
    return {
      output: '',
      error: t('csvjson.errors.invalidJson', { msg }),
    }
  }
})

const swap = () => {
  if (conversion.value.output.length === 0) return
  input.value = conversion.value.output
}

const copyOutput = async () => {
  if (conversion.value.output.length === 0) return
  try {
    await navigator.clipboard.writeText(conversion.value.output)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // silent
  }
}

const download = () => {
  if (conversion.value.output.length === 0) return
  const isJson = resolvedDirection.value === 'csv2json'
  const ext = isJson ? 'json' : 'csv'
  const mime = isJson ? 'application/json' : 'text/csv'
  const blob = new Blob([conversion.value.output], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `csvjson.${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const loadExample = () => {
  if (resolvedDirection.value === 'json2csv') {
    input.value = 'name,age,city\nMaría,30,Madrid\nJuan,25,Barcelona\n"Lee, A.",42,"Seoul"'
  } else {
    input.value = JSON.stringify(
      [
        { name: 'María', age: 30, city: 'Madrid' },
        { name: 'Juan', age: 25, city: 'Barcelona' },
        { name: 'Lee, A.', age: 42, city: 'Seoul' },
      ],
      null,
      2,
    )
  }
}

const clear = () => {
  input.value = ''
}

const directionOptions: Direction[] = ['auto', 'csv2json', 'json2csv']
const delimOptions: DelimChoice[] = ['auto', ',', ';', '\t', '|']

const detectedLabel = computed(() => {
  if (detected.value === 'empty') return ''
  return t(`csvjson.detected.${detected.value}`)
})
</script>

<template>
  <div class="csvjson">
    <div class="card options">
      <div class="row">
        <label class="field grow">
          <span>{{ t('csvjson.direction.label') }}</span>
          <select v-model="direction">
            <option v-for="d in directionOptions" :key="d" :value="d">
              {{ t(`csvjson.direction.${d}`) }}
            </option>
          </select>
        </label>
        <label class="field grow">
          <span>{{ t('csvjson.delimiter.label') }}</span>
          <select v-model="delimChoice">
            <option v-for="d in delimOptions" :key="d" :value="d">
              {{ t(`csvjson.delimiter.${d === '\t' ? 'tab' : d === ',' ? 'comma' : d === ';' ? 'semicolon' : d === '|' ? 'pipe' : 'auto'}`) }}
            </option>
          </select>
        </label>
      </div>
      <div class="checks">
        <label class="chk">
          <input v-model="hasHeader" type="checkbox" />
          <span>{{ t('csvjson.hasHeader') }}</span>
        </label>
        <label class="chk">
          <input v-model="pretty" type="checkbox" />
          <span>{{ t('csvjson.pretty') }}</span>
        </label>
        <span v-if="detectedLabel" class="detected">
          {{ t('csvjson.detected.label') }}: <strong>{{ detectedLabel }}</strong>
        </span>
      </div>
    </div>

    <div class="panes">
      <div class="pane card">
        <header class="pane-head">
          <span class="pane-title">{{ t('csvjson.input') }}</span>
          <div class="pane-actions">
            <button class="btn btn-ghost btn-sm" type="button" @click="loadExample">
              {{ t('csvjson.actions.example') }}
            </button>
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              :disabled="input.length === 0"
              @click="clear"
            >
              {{ t('csvjson.actions.clear') }}
            </button>
          </div>
        </header>
        <textarea
          v-model="input"
          class="editor"
          spellcheck="false"
          :placeholder="t('csvjson.inputPlaceholder')"
        />
      </div>

      <div class="pane card">
        <header class="pane-head">
          <span class="pane-title">{{ t('csvjson.output') }}</span>
          <div class="pane-actions">
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              :disabled="conversion.output.length === 0"
              @click="swap"
            >
              ↑ {{ t('csvjson.actions.useAsInput') }}
            </button>
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              :disabled="conversion.output.length === 0"
              @click="copyOutput"
            >
              {{ copied ? t('csvjson.actions.copied') : t('csvjson.actions.copy') }}
            </button>
            <button
              class="btn btn-sm"
              type="button"
              :disabled="conversion.output.length === 0"
              @click="download"
            >
              {{ t('csvjson.actions.download') }}
            </button>
          </div>
        </header>
        <textarea
          v-if="!conversion.error"
          class="editor"
          spellcheck="false"
          readonly
          :value="conversion.output"
          :placeholder="t('csvjson.outputPlaceholder')"
        />
        <p v-else class="error">{{ conversion.error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.csvjson {
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
.options .row {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field.grow {
  flex: 1 1 180px;
}
.field select {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
}
.checks {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}
.chk {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}
.detected {
  font-size: 0.82rem;
  color: var(--muted);
  margin-left: auto;
}
.panes {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 800px) {
  .panes {
    grid-template-columns: 1fr 1fr;
  }
}
.pane {
  gap: 0.6rem;
}
.pane-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.pane-title {
  font-weight: 600;
  font-size: 0.95rem;
}
.pane-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.editor {
  width: 100%;
  min-height: 18rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  resize: vertical;
  white-space: pre;
}
.error {
  margin: 0;
  color: #b53a1f;
  font-size: 0.9rem;
  padding: 0.7rem 0.85rem;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-height: 18rem;
  white-space: pre-wrap;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
