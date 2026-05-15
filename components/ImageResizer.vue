<script setup lang="ts">
import type { OutputFormat, ResizeResult } from '~/composables/useImageResize'

const { t } = useI18n()
const { resize, readDimensions } = useImageResize()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const sourceFile = ref<File | null>(null)
const sourceDimensions = ref<{ width: number; height: number } | null>(null)
const sourceBytes = ref(0)

const targetWidth = ref(800)
const targetHeight = ref(600)
const keepRatio = ref(true)
const format = ref<OutputFormat>('image/jpeg')
const quality = ref(90)

const isProcessing = ref(false)
const result = ref<ResizeResult | null>(null)
const errorMessage = ref<string | null>(null)

const ratio = computed(() =>
  sourceDimensions.value
    ? sourceDimensions.value.width / sourceDimensions.value.height
    : 1,
)

const onPickFiles = () => fileInput.value?.click()

const handleFiles = async (files: FileList | null) => {
  if (!files || files.length === 0) return
  const file = files[0]
  if (!file.type.startsWith('image/')) {
    errorMessage.value = t('errors.notAnImage')
    return
  }
  errorMessage.value = null
  sourceFile.value = file
  sourceBytes.value = file.size
  result.value = null

  const dims = await readDimensions(file)
  sourceDimensions.value = dims
  targetWidth.value = dims.width
  targetHeight.value = dims.height
}

const onFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  handleFiles(input.files)
}

const onDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragOver.value = false
  handleFiles(event.dataTransfer?.files ?? null)
}

const onWidthInput = () => {
  if (keepRatio.value && sourceDimensions.value) {
    targetHeight.value = Math.max(1, Math.round(targetWidth.value / ratio.value))
  }
}

const onHeightInput = () => {
  if (keepRatio.value && sourceDimensions.value) {
    targetWidth.value = Math.max(1, Math.round(targetHeight.value * ratio.value))
  }
}

const onResize = async () => {
  if (!sourceFile.value) return
  isProcessing.value = true
  errorMessage.value = null
  try {
    if (result.value) URL.revokeObjectURL(result.value.url)
    result.value = await resize(sourceFile.value, {
      width: targetWidth.value,
      height: targetHeight.value,
      format: format.value,
      quality: quality.value / 100,
    })
  } catch (err) {
    errorMessage.value = (err as Error).message
  } finally {
    isProcessing.value = false
  }
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const downloadName = computed(() => {
  if (!sourceFile.value) return 'image'
  const ext = format.value.split('/')[1]
  const base = sourceFile.value.name.replace(/\.[^.]+$/, '')
  return `${base}-mochi.${ext === 'jpeg' ? 'jpg' : ext}`
})

onBeforeUnmount(() => {
  if (result.value) URL.revokeObjectURL(result.value.url)
})
</script>

<template>
  <div class="resizer">
    <div
      class="dropzone"
      :class="{ 'is-over': isDragOver }"
      role="button"
      tabindex="0"
      @click="onPickFiles"
      @keydown.enter.prevent="onPickFiles"
      @keydown.space.prevent="onPickFiles"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop="onDrop"
    >
      <p v-if="!sourceFile">{{ t('dropzone.empty') }}</p>
      <p v-else>
        <strong>{{ sourceFile.name }}</strong>
        <br />
        <small>
          {{ sourceDimensions?.width }} × {{ sourceDimensions?.height }} px ·
          {{ formatBytes(sourceBytes) }}
        </small>
      </p>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        hidden
        @change="onFileChange"
      />
    </div>

    <div v-if="sourceFile" class="card controls">
      <div class="row">
        <label class="field">
          <span>{{ t('controls.width') }}</span>
          <input
            v-model.number="targetWidth"
            type="number"
            min="1"
            @input="onWidthInput"
          />
        </label>
        <label class="field">
          <span>{{ t('controls.height') }}</span>
          <input
            v-model.number="targetHeight"
            type="number"
            min="1"
            @input="onHeightInput"
          />
        </label>
        <label class="field field-inline">
          <input v-model="keepRatio" type="checkbox" />
          <span>{{ t('controls.keepRatio') }}</span>
        </label>
      </div>

      <div class="row">
        <label class="field">
          <span>{{ t('controls.format') }}</span>
          <select v-model="format">
            <option value="image/jpeg">JPEG</option>
            <option value="image/png">PNG</option>
            <option value="image/webp">WebP</option>
          </select>
        </label>
        <label v-if="format !== 'image/png'" class="field">
          <span>{{ t('controls.quality') }} ({{ quality }}%)</span>
          <input v-model.number="quality" type="range" min="10" max="100" />
        </label>
      </div>

      <div class="actions">
        <button
          class="btn"
          type="button"
          :disabled="isProcessing"
          @click="onResize"
        >
          {{ isProcessing ? t('actions.processing') : t('actions.resize') }}
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-if="result" class="card result">
      <h2>{{ t('result.title') }}</h2>
      <img :src="result.url" alt="" class="preview" />
      <p class="result-meta">
        {{ result.width }} × {{ result.height }} px ·
        {{ formatBytes(result.bytes) }}
      </p>
      <a class="btn" :href="result.url" :download="downloadName">
        {{ t('actions.download') }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.resizer {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.row .field {
  flex: 1 1 140px;
}
.field-inline {
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}
.actions {
  display: flex;
  justify-content: flex-end;
}
.error {
  color: #b53a1f;
  margin: 0;
}
.result {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: flex-start;
}
.result h2 {
  margin: 0;
  font-size: 1.1rem;
}
.result-meta {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}
.preview {
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border);
}
</style>
