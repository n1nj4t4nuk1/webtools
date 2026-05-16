<script setup lang="ts">
import type { OutputFormat } from '~/composables/useConvy'
import { EXT_MAP, OUTPUT_FORMATS } from '~/composables/useConvy'

const { t } = useI18n()
const { detectFormat, supportsQuality, convert, inspect } = useConvy()

interface LoadedImage {
  file: File
  format: string
  width: number
  height: number
  size: number
}

const loaded = ref<LoadedImage | null>(null)
const outputFormat = ref<OutputFormat>('webp')
const quality = ref(90)
const isDragging = ref(false)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

interface LastResult {
  size: number
  width: number
  height: number
  format: OutputFormat
}
const lastResult = ref<LastResult | null>(null)

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const loadFile = async (file: File) => {
  errorMessage.value = null
  lastResult.value = null
  if (!file.type.startsWith('image/')) {
    errorMessage.value = t('convy.errors.notImage', { name: file.name })
    return
  }
  try {
    const { width, height } = await inspect(file)
    loaded.value = {
      file,
      format: detectFormat(file),
      width,
      height,
      size: file.size,
    }
  } catch {
    errorMessage.value = t('convy.errors.notImage', { name: file.name })
  }
}

const onDrop = (event: DragEvent) => {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) loadFile(file)
}

const onSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) loadFile(file)
  target.value = ''
}

const clear = () => {
  loaded.value = null
  lastResult.value = null
  errorMessage.value = null
}

const doConvert = async () => {
  if (!loaded.value) return
  isProcessing.value = true
  errorMessage.value = null
  try {
    const result = await convert(loaded.value.file, outputFormat.value, quality.value)
    const baseName = loaded.value.file.name.replace(/\.[^/.]+$/, '')
    const ext = EXT_MAP[outputFormat.value]
    const url = URL.createObjectURL(result.blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    lastResult.value = {
      size: result.blob.size,
      width: result.width,
      height: result.height,
      format: outputFormat.value,
    }
  } catch {
    errorMessage.value = t('convy.errors.conversion')
  } finally {
    isProcessing.value = false
  }
}

const sizeRatio = computed(() => {
  if (!loaded.value || !lastResult.value) return null
  return lastResult.value.size / loaded.value.size
})

const ratioLabel = computed(() => {
  if (sizeRatio.value === null) return ''
  const pct = (sizeRatio.value * 100).toFixed(0)
  if (sizeRatio.value < 1) return t('convy.result.smaller', { pct })
  if (sizeRatio.value > 1) return t('convy.result.larger', { pct })
  return t('convy.result.same')
})

const showQuality = computed(() => supportsQuality(outputFormat.value))
</script>

<template>
  <div class="convy">
    <div
      v-if="!loaded"
      class="dropzone"
      :class="{ active: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <p>{{ t('convy.dropzone') }}</p>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        hidden
        @change="onSelect"
      />
    </div>

    <div v-else class="card">
      <header class="file-header">
        <div class="meta">
          <span class="name" :title="loaded.file.name">{{ loaded.file.name }}</span>
          <span class="sub">
            {{ loaded.format }} · {{ loaded.width }}×{{ loaded.height }} · {{ formatBytes(loaded.size) }}
          </span>
        </div>
        <button class="btn btn-ghost btn-sm" type="button" @click="clear">
          {{ t('convy.actions.change') }}
        </button>
      </header>

      <div class="row">
        <label class="field grow">
          <span>{{ t('convy.format.label') }}</span>
          <select v-model="outputFormat">
            <option v-for="f in OUTPUT_FORMATS" :key="f" :value="f">
              {{ t(`convy.format.${f}`) }}
            </option>
          </select>
        </label>
        <label v-if="showQuality" class="field grow">
          <span>{{ t('convy.quality') }} ({{ quality }})</span>
          <input v-model.number="quality" type="range" min="1" max="100" />
        </label>
      </div>
      <p v-if="!showQuality" class="hint">{{ t('convy.qualityHintLossless') }}</p>

      <div class="actions">
        <button class="btn" type="button" :disabled="isProcessing" @click="doConvert">
          {{ isProcessing ? t('convy.actions.processing') : t('convy.actions.convert') }}
        </button>
      </div>

      <div v-if="lastResult" class="result-card">
        <div class="result-row">
          <span class="result-label">{{ t('convy.result.size') }}</span>
          <strong>{{ formatBytes(lastResult.size) }}</strong>
        </div>
        <div class="result-row">
          <span class="result-label">{{ t('convy.result.ratio') }}</span>
          <strong>{{ ratioLabel }}</strong>
        </div>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.convy {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  color: var(--muted);
  transition: background 0.15s, border-color 0.15s;
}
.dropzone.active,
.dropzone:hover {
  background: var(--surface);
  border-color: var(--accent, #888);
}
.dropzone p {
  margin: 0;
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
.file-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}
.meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sub {
  font-size: 0.78rem;
  color: var(--muted);
}
.row {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field.grow {
  flex: 1 1 200px;
}
.field select,
.field input[type='range'] {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}
.actions {
  display: flex;
  justify-content: flex-end;
}
.result-card {
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.7rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.result-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}
.result-label {
  font-size: 0.85rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.error {
  color: #b53a1f;
  margin: 0;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
