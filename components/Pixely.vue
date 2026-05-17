<script setup lang="ts">
import type { OutputFormat } from '~/composables/usePixely'
import { FORMATS } from '~/composables/usePixely'

const { t } = useI18n()
const { loadBitmap, pixelateToCanvas, exportBlob, extFor, inspect } = usePixely()

interface LoadedImage {
  file: File
  bitmap: ImageBitmap
  width: number
  height: number
  size: number
}

const loaded = ref<LoadedImage | null>(null)
const blockSize = ref(12)
const format = ref<OutputFormat>('png')
const quality = ref(90)
const isDragging = ref(false)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const showQuality = computed(() => format.value === 'jpeg')

const renderPreview = () => {
  if (!loaded.value || !canvasRef.value) return
  try {
    pixelateToCanvas(loaded.value.bitmap, blockSize.value, canvasRef.value)
  } catch (err) {
    errorMessage.value = (err as Error).message
  }
}

const loadFile = async (file: File) => {
  errorMessage.value = null
  if (!file.type.startsWith('image/')) {
    errorMessage.value = t('pixely.errors.notImage', { name: file.name })
    return
  }
  try {
    if (loaded.value) loaded.value.bitmap.close()
    const bitmap = await loadBitmap(file)
    loaded.value = {
      file,
      bitmap,
      width: bitmap.width,
      height: bitmap.height,
      size: file.size,
    }
    await nextTick()
    renderPreview()
  } catch {
    errorMessage.value = t('pixely.errors.notImage', { name: file.name })
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
  if (loaded.value) loaded.value.bitmap.close()
  loaded.value = null
  errorMessage.value = null
}

const download = async () => {
  if (!loaded.value || !canvasRef.value) return
  isProcessing.value = true
  try {
    const blob = await exportBlob(canvasRef.value, format.value, quality.value)
    const baseName = loaded.value.file.name.replace(/\.[^/.]+$/, '')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName}-pixely.${extFor(format.value)}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    errorMessage.value = t('pixely.errors.generic')
  } finally {
    isProcessing.value = false
  }
}

watch(blockSize, renderPreview)
</script>

<template>
  <div class="pixely">
    <div
      v-if="!loaded"
      class="dropzone"
      :class="{ active: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <p>{{ t('pixely.dropzone') }}</p>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        hidden
        @change="onSelect"
      />
    </div>

    <template v-else>
      <div class="card">
        <header class="file-header">
          <div class="meta">
            <span class="name" :title="loaded.file.name">{{ loaded.file.name }}</span>
            <span class="sub">
              {{ loaded.width }}×{{ loaded.height }} · {{ formatBytes(loaded.size) }}
            </span>
          </div>
          <button class="btn btn-ghost btn-sm" type="button" @click="clear">
            {{ t('pixely.actions.change') }}
          </button>
        </header>
      </div>

      <div class="preview-card">
        <canvas ref="canvasRef" class="preview" />
      </div>

      <div class="card">
        <label class="field">
          <span>{{ t('pixely.blockSize') }} ({{ blockSize }}px)</span>
          <input v-model.number="blockSize" type="range" min="2" max="100" />
        </label>

        <div class="row">
          <label class="field grow">
            <span>{{ t('pixely.format.label') }}</span>
            <select v-model="format">
              <option v-for="f in FORMATS" :key="f" :value="f">
                {{ t(`pixely.format.${f}`) }}
              </option>
            </select>
          </label>
          <label v-if="showQuality" class="field grow">
            <span>{{ t('pixely.quality') }} ({{ quality }})</span>
            <input v-model.number="quality" type="range" min="40" max="100" />
          </label>
        </div>

        <div class="actions">
          <button class="btn" type="button" :disabled="isProcessing" @click="download">
            {{ isProcessing ? t('pixely.actions.processing') : t('pixely.actions.download') }}
          </button>
        </div>
      </div>
    </template>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.pixely {
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
.preview-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}
.preview {
  max-width: 100%;
  max-height: 32rem;
  height: auto;
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field.grow {
  flex: 1 1 200px;
}
.row {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
.field select,
.field input[type='range'] {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.actions {
  display: flex;
  justify-content: flex-end;
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
