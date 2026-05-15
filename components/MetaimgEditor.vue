<script setup lang="ts">
import type { ExifFields } from '~/composables/useExif'

const { t } = useI18n()
const { read, write, strip, empty } = useExif()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const sourceFile = ref<File | null>(null)
const fields = ref<ExifFields>(empty())
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)
const resultUrl = ref<string | null>(null)
const resultBytes = ref(0)

const orientationOptions = [
  { value: 1, label: '1 — Normal' },
  { value: 2, label: '2 — Flip H' },
  { value: 3, label: '3 — 180°' },
  { value: 4, label: '4 — Flip V' },
  { value: 5, label: '5 — Transpose' },
  { value: 6, label: '6 — 90° CW' },
  { value: 7, label: '7 — Transverse' },
  { value: 8, label: '8 — 90° CCW' },
]

const fieldDefs: { key: keyof ExifFields; type: 'text' | 'select' }[] = [
  { key: 'make', type: 'text' },
  { key: 'model', type: 'text' },
  { key: 'lensModel', type: 'text' },
  { key: 'software', type: 'text' },
  { key: 'artist', type: 'text' },
  { key: 'copyright', type: 'text' },
  { key: 'imageDescription', type: 'text' },
  { key: 'dateTime', type: 'text' },
  { key: 'dateTimeOriginal', type: 'text' },
  { key: 'orientation', type: 'select' },
]

const onPickFiles = () => fileInput.value?.click()

const releaseResult = () => {
  if (resultUrl.value) {
    URL.revokeObjectURL(resultUrl.value)
    resultUrl.value = null
    resultBytes.value = 0
  }
}

const handleFiles = async (files: FileList | null) => {
  if (!files || files.length === 0) return
  const file = files[0]
  releaseResult()
  errorMessage.value = null
  try {
    const data = await read(file)
    sourceFile.value = file
    fields.value = data
  } catch (err) {
    if ((err as Error).message === 'not-jpeg') {
      errorMessage.value = t('metaimg.errors.notJpeg')
    } else {
      errorMessage.value = (err as Error).message
    }
    sourceFile.value = null
    fields.value = empty()
  }
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

const setResultFromBlob = (blob: Blob) => {
  releaseResult()
  resultUrl.value = URL.createObjectURL(blob)
  resultBytes.value = blob.size
}

const onStrip = async () => {
  if (!sourceFile.value) return
  isProcessing.value = true
  errorMessage.value = null
  try {
    const blob = await strip(sourceFile.value)
    setResultFromBlob(blob)
    fields.value = empty()
  } catch (err) {
    errorMessage.value = (err as Error).message
  } finally {
    isProcessing.value = false
  }
}

const onApply = async () => {
  if (!sourceFile.value) return
  isProcessing.value = true
  errorMessage.value = null
  try {
    const blob = await write(sourceFile.value, fields.value)
    setResultFromBlob(blob)
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
  if (!sourceFile.value) return 'image.jpg'
  const base = sourceFile.value.name.replace(/\.[^.]+$/, '')
  return `${base}-metaimg.jpg`
})

onBeforeUnmount(releaseResult)
</script>

<template>
  <div class="metaimg">
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
      <p v-if="!sourceFile">{{ t('metaimg.dropzone') }}</p>
      <p v-else>
        <strong>{{ sourceFile.name }}</strong>
        <br />
        <small>{{ formatBytes(sourceFile.size) }}</small>
      </p>
      <input
        ref="fileInput"
        type="file"
        accept="image/jpeg"
        hidden
        @change="onFileChange"
      />
    </div>

    <div v-if="sourceFile" class="card form">
      <h2>{{ t('metaimg.fields.title') }}</h2>
      <p class="hint">{{ t('metaimg.fields.hint') }}</p>

      <div class="grid">
        <label v-for="def in fieldDefs" :key="def.key" class="field">
          <span>{{ t(`metaimg.fields.${def.key}`) }}</span>
          <select
            v-if="def.type === 'select'"
            v-model.number="fields.orientation"
          >
            <option
              v-for="o in orientationOptions"
              :key="o.value"
              :value="o.value"
            >
              {{ o.label }}
            </option>
          </select>
          <input
            v-else
            v-model="fields[def.key] as string"
            type="text"
            :placeholder="t(`metaimg.fields.placeholder.${def.key}`)"
          />
        </label>
      </div>

      <div class="actions">
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="isProcessing"
          @click="onStrip"
        >
          {{ t('metaimg.actions.strip') }}
        </button>
        <button
          class="btn"
          type="button"
          :disabled="isProcessing"
          @click="onApply"
        >
          {{ isProcessing ? t('actions.processing') : t('metaimg.actions.apply') }}
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-if="resultUrl" class="card result">
      <h2>{{ t('result.title') }}</h2>
      <img :src="resultUrl" alt="" class="preview" />
      <p class="result-meta">{{ formatBytes(resultBytes) }}</p>
      <a class="btn" :href="resultUrl" :download="downloadName">
        {{ t('actions.download') }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.metaimg {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.form h2 {
  margin: 0;
  font-size: 1.1rem;
}
.hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.85rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.85rem;
}
.field input[type='text'],
.field select {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.55rem;
  font: inherit;
  background: var(--bg);
}
.actions {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
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
