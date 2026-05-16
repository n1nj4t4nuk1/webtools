<script setup lang="ts">
import type { CombinyField, FieldMode } from '~/composables/useCombiny'
import { MAX_RESULTS } from '~/composables/useCombiny'

const { t } = useI18n()
const { generate } = useCombiny()

const MAX_FIELDS = 6
const DOWNLOAD_CAP = 100000

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const fields = ref<CombinyField[]>([
  { id: makeId(), value: '', mode: 'full' },
  { id: makeId(), value: '', mode: 'full' },
])

const separator = ref('.')
const prefix = ref('')
const suffix = ref('')
const permuteOrder = ref(false)
const includeSubsets = ref(false)
const downloadOnly = ref(false)
const copied = ref(false)

const result = computed(() =>
  generate(
    {
      fields: fields.value,
      separator: separator.value,
      prefix: prefix.value,
      suffix: suffix.value,
      permuteOrder: permuteOrder.value,
      includeSubsets: includeSubsets.value,
    },
    downloadOnly.value ? DOWNLOAD_CAP : MAX_RESULTS,
  ),
)

const canAdd = computed(() => fields.value.length < MAX_FIELDS)
const canRemove = computed(() => fields.value.length > 1)

const addField = () => {
  if (!canAdd.value) return
  fields.value.push({ id: makeId(), value: '', mode: 'full' })
}

const removeField = (id: string) => {
  if (!canRemove.value) return
  fields.value = fields.value.filter((f) => f.id !== id)
}

const placeholderFor = (index: number): string => {
  const list = t('combiny.fields.examples').split('|')
  return list[index] ?? t('combiny.fields.valuePlaceholder')
}

const copyAll = async () => {
  try {
    await navigator.clipboard.writeText(result.value.combinations.join('\n'))
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // silent
  }
}

const downloadTxt = () => {
  const content = result.value.combinations.join('\n')
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'combiny.txt'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const modeOptions: FieldMode[] = ['full', 'initial', 'both']
</script>

<template>
  <div class="combiny">
    <div class="card">
      <header class="section-head">
        <h2 class="section-title">{{ t('combiny.fields.title') }}</h2>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="!canAdd"
          @click="addField"
        >
          + {{ t('combiny.fields.add') }}
        </button>
      </header>

      <ul class="field-list">
        <li v-for="(field, i) in fields" :key="field.id" class="field-row">
          <input
            v-model="field.value"
            type="text"
            class="value-input"
            :placeholder="placeholderFor(i)"
          />
          <select v-model="field.mode" class="mode-select">
            <option v-for="m in modeOptions" :key="m" :value="m">
              {{ t(`combiny.fields.mode.${m}`) }}
            </option>
          </select>
          <button
            type="button"
            class="btn-icon"
            :disabled="!canRemove"
            :title="t('combiny.fields.remove')"
            @click="removeField(field.id)"
          >
            ×
          </button>
        </li>
      </ul>
    </div>

    <div class="card options">
      <div class="row">
        <label class="field grow">
          <span>{{ t('combiny.options.prefix') }}</span>
          <input
            v-model="prefix"
            type="text"
            :placeholder="t('combiny.options.prefixPlaceholder')"
          />
        </label>
        <label class="field grow">
          <span>{{ t('combiny.options.separator') }}</span>
          <input
            v-model="separator"
            type="text"
            :placeholder="t('combiny.options.separatorPlaceholder')"
          />
        </label>
        <label class="field grow">
          <span>{{ t('combiny.options.suffix') }}</span>
          <input
            v-model="suffix"
            type="text"
            :placeholder="t('combiny.options.suffixPlaceholder')"
          />
        </label>
      </div>
      <label class="chk">
        <input v-model="permuteOrder" type="checkbox" />
        <span>{{ t('combiny.options.permute') }}</span>
      </label>
      <p class="hint">{{ t('combiny.options.permuteHint') }}</p>

      <label class="chk">
        <input v-model="includeSubsets" type="checkbox" />
        <span>{{ t('combiny.options.subsets') }}</span>
      </label>
      <p class="hint">{{ t('combiny.options.subsetsHint') }}</p>

      <label class="chk">
        <input v-model="downloadOnly" type="checkbox" />
        <span>{{ t('combiny.options.downloadOnly') }}</span>
      </label>
      <p class="hint">{{ t('combiny.options.downloadOnlyHint') }}</p>
    </div>

    <div class="card results">
      <header class="section-head">
        <h2 class="section-title">
          {{ t('combiny.results.title', { count: result.combinations.length }) }}
        </h2>
        <div class="header-actions">
          <button
            v-if="result.combinations.length > 0 && downloadOnly"
            type="button"
            class="btn btn-sm"
            @click="downloadTxt"
          >
            {{ t('combiny.results.download') }}
          </button>
          <button
            v-if="result.combinations.length > 0 && !downloadOnly"
            type="button"
            class="btn btn-ghost btn-sm"
            @click="copyAll"
          >
            {{ copied ? t('combiny.results.copied') : t('combiny.results.copyAll') }}
          </button>
        </div>
      </header>

      <p v-if="result.combinations.length === 0" class="empty">
        {{ t('combiny.results.empty') }}
      </p>
      <template v-else>
        <p
          v-if="result.totalGenerated > result.combinations.length"
          class="warn"
        >
          {{
            t('combiny.results.limited', {
              limit: downloadOnly ? DOWNLOAD_CAP : MAX_RESULTS,
              total: result.totalGenerated,
            })
          }}
        </p>
        <p v-if="downloadOnly" class="empty">
          {{ t('combiny.results.downloadHint', { count: result.combinations.length }) }}
        </p>
        <ul v-else class="result-list">
          <li v-for="combo in result.combinations" :key="combo">
            <code>{{ combo }}</code>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style scoped>
.combiny {
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
.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.header-actions {
  display: inline-flex;
  gap: 0.4rem;
}
.section-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
}
.field-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.field-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.value-input {
  flex: 1;
  min-width: 0;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
}
.mode-select {
  padding: 0.45rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font-size: 0.9rem;
}
.btn-icon {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  width: 1.8rem;
  height: 1.8rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.95rem;
  line-height: 1;
}
.btn-icon:hover:not(:disabled) {
  background: var(--surface);
}
.btn-icon:disabled {
  opacity: 0.35;
  cursor: not-allowed;
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
.field input {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
}
.chk {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}
.hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}
.empty {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}
.warn {
  margin: 0;
  font-size: 0.82rem;
  color: #b58300;
}
.result-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.3rem 0.6rem;
  max-height: 28rem;
  overflow-y: auto;
}
.result-list li {
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.35rem 0.55rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
  word-break: break-all;
  user-select: all;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
