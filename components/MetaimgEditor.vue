<script setup lang="ts">
import type { ExifTag, ExifTagDef } from '~/composables/useExif'

const { t } = useI18n()
const { read, write, strip, allDefinedTags, newTagFromDef } = useExif()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)
const sourceFile = ref<File | null>(null)
const tags = ref<ExifTag[]>([])
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)
const resultUrl = ref<string | null>(null)
const resultBytes = ref(0)

const showAddPicker = ref(false)
const addQuery = ref('')
const selectedDefKey = ref<string>('')

const tagDefs = computed<ExifTagDef[]>(() => allDefinedTags())
const presentKeys = computed(() => new Set(tags.value.map((t) => `${t.ifd}:${t.id}`)))

const filteredDefs = computed(() => {
  const q = addQuery.value.trim().toLowerCase()
  return tagDefs.value.filter((def) => {
    if (presentKeys.value.has(`${def.ifd}:${def.id}`)) return false
    if (!q) return true
    return def.name.toLowerCase().includes(q) || def.ifd.toLowerCase().includes(q)
  })
})

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
    tags.value = data
  } catch (err) {
    if ((err as Error).message === 'not-jpeg') {
      errorMessage.value = t('metaimg.errors.notJpeg')
    } else {
      errorMessage.value = (err as Error).message
    }
    sourceFile.value = null
    tags.value = []
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

const removeTag = (tag: ExifTag) => {
  tags.value = tags.value.filter((t) => !(t.ifd === tag.ifd && t.id === tag.id))
}

const addSelectedTag = () => {
  const [ifd, idStr] = selectedDefKey.value.split(':')
  if (!ifd || !idStr) return
  const def = tagDefs.value.find(
    (d) => d.ifd === ifd && d.id === Number(idStr),
  )
  if (!def) return
  tags.value = [...tags.value, newTagFromDef(def)]
  selectedDefKey.value = ''
  addQuery.value = ''
  showAddPicker.value = false
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
    tags.value = []
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
    const blob = await write(sourceFile.value, tags.value)
    setResultFromBlob(blob)
  } catch (err) {
    const msg = (err as Error).message
    if (msg.startsWith('invalid-value:')) {
      const tagName = msg.split(':')[1]
      errorMessage.value = t('metaimg.errors.invalidValue', { tag: tagName })
    } else {
      errorMessage.value = msg
    }
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
      <header class="form-header">
        <h2>{{ t('metaimg.tags.title', { count: tags.length }) }}</h2>
        <p class="hint">{{ t('metaimg.tags.hint') }}</p>
      </header>

      <p v-if="tags.length === 0" class="empty">{{ t('metaimg.tags.empty') }}</p>

      <ul v-else class="tag-list">
        <li v-for="tag in tags" :key="`${tag.ifd}:${tag.id}`" class="tag-row">
          <div class="tag-meta">
            <span class="tag-name">{{ tag.name }}</span>
            <span class="tag-sub">{{ tag.ifd }} · {{ tag.type }}</span>
          </div>
          <input
            v-if="tag.editable"
            v-model="tag.display"
            class="tag-value"
            type="text"
          />
          <span v-else class="tag-value tag-value-readonly">{{ tag.display }}</span>
          <button
            type="button"
            class="tag-remove"
            :aria-label="t('metaimg.tags.remove')"
            @click="removeTag(tag)"
          >
            ×
          </button>
        </li>
      </ul>

      <div class="add-block">
        <button
          v-if="!showAddPicker"
          type="button"
          class="btn btn-ghost"
          @click="showAddPicker = true"
        >
          + {{ t('metaimg.tags.add') }}
        </button>
        <div v-else class="add-picker">
          <input
            v-model="addQuery"
            type="text"
            :placeholder="t('metaimg.tags.searchPlaceholder')"
            class="add-search"
          />
          <select v-model="selectedDefKey" size="6" class="add-select">
            <option
              v-for="def in filteredDefs.slice(0, 200)"
              :key="`${def.ifd}:${def.id}`"
              :value="`${def.ifd}:${def.id}`"
            >
              {{ def.name }} ({{ def.ifd }} · {{ def.type }})
            </option>
          </select>
          <div class="add-actions">
            <button
              type="button"
              class="btn btn-ghost"
              @click="(showAddPicker = false), (selectedDefKey = ''), (addQuery = '')"
            >
              {{ t('metaimg.actions.cancel') }}
            </button>
            <button
              type="button"
              class="btn"
              :disabled="!selectedDefKey"
              @click="addSelectedTag"
            >
              {{ t('metaimg.tags.confirmAdd') }}
            </button>
          </div>
        </div>
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
.form-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
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
.empty {
  margin: 0;
  color: var(--muted);
  font-style: italic;
  text-align: center;
  padding: 1rem 0;
}
.tag-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.tag-row {
  display: grid;
  grid-template-columns: minmax(150px, 1fr) 2fr auto;
  gap: 0.6rem;
  align-items: center;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
}
.tag-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.tag-name {
  font-weight: 600;
  font-size: 0.9rem;
}
.tag-sub {
  font-size: 0.75rem;
  color: var(--muted);
}
.tag-value {
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.3rem 0.5rem;
  font: inherit;
  font-size: 0.88rem;
  background: var(--surface);
  width: 100%;
  min-width: 0;
}
.tag-value-readonly {
  background: transparent;
  border-color: transparent;
  color: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
  padding: 0.3rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tag-remove {
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 1.3rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 0.25rem;
  border-radius: 4px;
}
.tag-remove:hover {
  color: #b53a1f;
  background: var(--accent-soft);
}
.add-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.add-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
}
.add-search {
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.4rem 0.55rem;
  font: inherit;
  background: var(--surface);
}
.add-select {
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.3rem;
  font: inherit;
  font-size: 0.85rem;
  background: var(--surface);
}
.add-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
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
