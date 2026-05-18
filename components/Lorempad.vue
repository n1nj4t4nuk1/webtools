<script setup lang="ts">
/**
 * Lorempad.vue
 *
 * Mode selector (paragraphs / sentences / words), count input, optional
 * "start with the classic Lorem ipsum opener" toggle and HTML / plain
 * output. The optional `wordsPerUnit` input forces every sentence or
 * paragraph to a fixed length when set. Delegates to `useLorempad.generate`
 * and offers a copy-to-clipboard action.
 */
import type { LorempadMode, OutputFormat } from '~/composables/useLorempad'

const { t } = useI18n()
const { generate } = useLorempad()

const mode = ref<LorempadMode>('paragraphs')
const count = ref(3)
const classic = ref(true)
const format = ref<OutputFormat>('plain')
const wordsPerUnit = ref(0)
const output = ref('')
const copied = ref(false)

const wordsLabelKey = computed(() =>
  mode.value === 'paragraphs'
    ? 'lorempad.wordsPerParagraph'
    : 'lorempad.wordsPerSentence',
)

const doGenerate = () => {
  output.value = generate(
    mode.value,
    count.value,
    classic.value,
    format.value,
    wordsPerUnit.value,
  )
}

onMounted(doGenerate)
watch([mode, count, classic, format, wordsPerUnit], doGenerate)

const copyOutput = async () => {
  if (output.value.length === 0) return
  try {
    await navigator.clipboard.writeText(output.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // silent
  }
}

const download = () => {
  if (output.value.length === 0) return
  const ext = format.value === 'html' ? 'html' : 'txt'
  const mime = format.value === 'html' ? 'text/html' : 'text/plain'
  const blob = new Blob([output.value], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `lorem.${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const modeOptions: LorempadMode[] = ['paragraphs', 'sentences', 'words']
const formatOptions: OutputFormat[] = ['plain', 'html']
</script>

<template>
  <div class="lorempad">
    <div class="card options">
      <div class="row">
        <label class="field grow">
          <span>{{ t('lorempad.mode.label') }}</span>
          <select v-model="mode">
            <option v-for="m in modeOptions" :key="m" :value="m">
              {{ t(`lorempad.mode.${m}`) }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>{{ t('lorempad.count') }}</span>
          <input v-model.number="count" type="number" min="1" max="1000" class="count-input" />
        </label>
        <label v-if="mode !== 'words'" class="field">
          <span>{{ t(wordsLabelKey) }}</span>
          <input
            v-model.number="wordsPerUnit"
            type="number"
            min="0"
            max="500"
            class="count-input"
          />
        </label>
        <label class="field grow">
          <span>{{ t('lorempad.format.label') }}</span>
          <select v-model="format">
            <option v-for="f in formatOptions" :key="f" :value="f">
              {{ t(`lorempad.format.${f}`) }}
            </option>
          </select>
        </label>
      </div>
      <p v-if="mode !== 'words'" class="hint">{{ t('lorempad.wordsHint') }}</p>
      <label class="chk">
        <input v-model="classic" type="checkbox" />
        <span>{{ t('lorempad.classic') }}</span>
      </label>
    </div>

    <div class="card output-card">
      <header class="output-head">
        <span class="title">{{ t('lorempad.output') }}</span>
        <div class="head-actions">
          <button class="btn btn-ghost btn-sm" type="button" @click="doGenerate">
            {{ t('lorempad.actions.regenerate') }}
          </button>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="output.length === 0"
            @click="copyOutput"
          >
            {{ copied ? t('lorempad.actions.copied') : t('lorempad.actions.copy') }}
          </button>
          <button
            class="btn btn-sm"
            type="button"
            :disabled="output.length === 0"
            @click="download"
          >
            {{ t('lorempad.actions.download') }}
          </button>
        </div>
      </header>
      <textarea class="editor" readonly :value="output" />
    </div>
  </div>
</template>

<style scoped>
.lorempad {
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
.field select,
.field input {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
}
.count-input {
  width: 6rem;
}
.chk {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}
.hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
}
.output-card {
  gap: 0.6rem;
}
.output-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.title {
  font-weight: 600;
  font-size: 0.95rem;
}
.head-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.editor {
  width: 100%;
  min-height: 20rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.88rem;
  line-height: 1.55;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  resize: vertical;
  white-space: pre-wrap;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
