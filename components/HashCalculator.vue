<script setup lang="ts">
import {
  ALL_ALGORITHMS,
  type HashAlgorithm,
} from '~/composables/useHash'

const { t } = useI18n()
const { hashAllText, hashAllFile, hexLengthToAlgorithm } = useHash()

const mode = ref<'text' | 'file'>('text')
const inputText = ref('')
const sourceFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)
const expected = ref('')
const copiedKey = ref<string | null>(null)

const results = ref<Partial<Record<HashAlgorithm, string>>>({})

const expectedClean = computed(() =>
  expected.value.trim().toLowerCase().replace(/\s+/g, ''),
)

const expectedAlgorithm = computed(() =>
  expectedClean.value ? hexLengthToAlgorithm(expectedClean.value.length) : null,
)

const matchedAlgorithm = computed(() => {
  if (!expectedClean.value) return null
  for (const algo of ALL_ALGORITHMS) {
    const value = results.value[algo]
    if (value && value.toLowerCase() === expectedClean.value) return algo
  }
  return null
})

const recomputeFromText = async (text: string) => {
  errorMessage.value = null
  if (!text) {
    results.value = {}
    return
  }
  isProcessing.value = true
  try {
    results.value = await hashAllText(text)
  } catch (err) {
    errorMessage.value = (err as Error).message
  } finally {
    isProcessing.value = false
  }
}

let textTimer: ReturnType<typeof setTimeout> | null = null
watch(inputText, (val) => {
  if (mode.value !== 'text') return
  if (textTimer) clearTimeout(textTimer)
  textTimer = setTimeout(() => recomputeFromText(val), 80)
})

const onPickFile = () => fileInput.value?.click()

const handleFile = async (file: File | null) => {
  if (!file) return
  sourceFile.value = file
  errorMessage.value = null
  isProcessing.value = true
  try {
    results.value = await hashAllFile(file)
  } catch (err) {
    errorMessage.value = (err as Error).message
  } finally {
    isProcessing.value = false
  }
}

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  handleFile(input.files?.[0] ?? null)
}

const onDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  handleFile(event.dataTransfer?.files?.[0] ?? null)
}

const switchMode = (next: 'text' | 'file') => {
  mode.value = next
  results.value = {}
  errorMessage.value = null
  if (next === 'text' && inputText.value) {
    recomputeFromText(inputText.value)
  }
}

const copyHash = async (algo: HashAlgorithm) => {
  const value = results.value[algo]
  if (!value) return
  try {
    await navigator.clipboard.writeText(value)
    copiedKey.value = algo
    setTimeout(() => {
      if (copiedKey.value === algo) copiedKey.value = null
    }, 1500)
  } catch {
    errorMessage.value = t('hashy.errors.clipboard')
  }
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}
</script>

<template>
  <div class="hashy">
    <div class="mode-toggle" role="tablist">
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'text'"
        class="mode-btn"
        :class="{ active: mode === 'text' }"
        @click="switchMode('text')"
      >
        {{ t('hashy.modeText') }}
      </button>
      <button
        type="button"
        role="tab"
        :aria-selected="mode === 'file'"
        class="mode-btn"
        :class="{ active: mode === 'file' }"
        @click="switchMode('file')"
      >
        {{ t('hashy.modeFile') }}
      </button>
    </div>

    <textarea
      v-if="mode === 'text'"
      v-model="inputText"
      class="text-input"
      :placeholder="t('hashy.textPlaceholder')"
      rows="6"
    />

    <div
      v-else
      class="dropzone"
      :class="{ 'is-over': isDragOver }"
      role="button"
      tabindex="0"
      @click="onPickFile"
      @keydown.enter.prevent="onPickFile"
      @keydown.space.prevent="onPickFile"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop="onDrop"
    >
      <p v-if="!sourceFile">{{ t('hashy.dropzone') }}</p>
      <p v-else>
        <strong>{{ sourceFile.name }}</strong>
        <br />
        <small>{{ formatBytes(sourceFile.size) }}</small>
      </p>
      <input
        ref="fileInput"
        type="file"
        hidden
        @change="onFileChange"
      />
    </div>

    <p v-if="isProcessing" class="hint">{{ t('hashy.processing') }}</p>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <ul v-if="Object.keys(results).length > 0" class="hash-list">
      <li
        v-for="algo in ALL_ALGORITHMS"
        :key="algo"
        class="hash-row"
        :class="{
          match: matchedAlgorithm === algo,
          mismatch: expectedAlgorithm === algo && matchedAlgorithm !== algo,
        }"
      >
        <span class="hash-algo">{{ algo }}</span>
        <code class="hash-value">{{ results[algo] }}</code>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          @click="copyHash(algo)"
        >
          {{ copiedKey === algo ? t('hashy.actions.copied') : t('hashy.actions.copy') }}
        </button>
      </li>
    </ul>

    <div v-if="Object.keys(results).length > 0" class="card verify">
      <label class="field">
        <span>{{ t('hashy.verify.label') }}</span>
        <input
          v-model="expected"
          type="text"
          :placeholder="t('hashy.verify.placeholder')"
          class="verify-input"
        />
      </label>
      <p v-if="expectedClean && !expectedAlgorithm" class="hint">
        {{ t('hashy.verify.unknownLength') }}
      </p>
      <p
        v-else-if="expectedAlgorithm && matchedAlgorithm"
        class="status status-ok"
      >
        ✓ {{ t('hashy.verify.match', { algo: matchedAlgorithm }) }}
      </p>
      <p
        v-else-if="expectedAlgorithm && !matchedAlgorithm"
        class="status status-bad"
      >
        ✗ {{ t('hashy.verify.mismatch', { algo: expectedAlgorithm }) }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.hashy {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.mode-toggle {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  padding: 2px;
  align-self: flex-start;
}
.mode-btn {
  border: 0;
  background: transparent;
  padding: 0.3rem 0.95rem;
  font: inherit;
  font-size: 0.85rem;
  color: var(--muted);
  cursor: pointer;
  border-radius: 999px;
}
.mode-btn.active {
  background: var(--accent);
  color: #fff;
}
.text-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  padding: 0.75rem;
  font: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
  resize: vertical;
}
.hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.85rem;
}
.error {
  color: #b53a1f;
  margin: 0;
}
.hash-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.hash-row {
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.55rem 0.75rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: border-color 0.15s ease;
}
.hash-row.match {
  border-color: #4c8c4a;
  background: #f0f7ec;
}
.hash-row.mismatch {
  border-color: #c44;
  background: #fbeeec;
}
.hash-algo {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--muted);
}
.hash-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  word-break: break-all;
  user-select: all;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
.verify {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.verify-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.45rem 0.6rem;
  font: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
  background: var(--bg);
}
.status {
  margin: 0;
  font-weight: 600;
  font-size: 0.9rem;
}
.status-ok {
  color: #2f6f2c;
}
.status-bad {
  color: #b53a1f;
}
</style>
