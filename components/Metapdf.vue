<script setup lang="ts">
/**
 * Metapdf.vue
 *
 * PDF dropzone followed by a form with one input per metadata field
 * (title, author, subject, comma-separated keywords, producer, creator,
 * creation / modification dates). The "now" button next to the date
 * fields stamps the current timestamp. Calls `useMetapdf.read` to populate
 * the form and `write` to emit a `<original>-metadata.pdf` download.
 */
import type { PdfFileInfo } from '~/composables/useMetapdf'

const { t } = useI18n()
const { read, write } = useMetapdf()

const fileName = ref<string | null>(null)
const fileData = ref<ArrayBuffer | null>(null)
const info = ref<PdfFileInfo | null>(null)

const title = ref('')
const author = ref('')
const subject = ref('')
const keywords = ref('')
const producer = ref('')
const creator = ref('')
const creationDate = ref('')
const modificationDate = ref('')

const isDragging = ref(false)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const pad = (n: number) => String(n).padStart(2, '0')
const toLocalInput = (d: Date | null): string => {
  if (!d) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const fromLocalInput = (s: string): Date | null => {
  if (s.length === 0) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

const loadFile = async (file: File) => {
  errorMessage.value = null
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    errorMessage.value = t('metapdf.errors.notPdf', { name: file.name })
    return
  }
  try {
    const buffer = await file.arrayBuffer()
    const meta = await read(buffer)
    fileData.value = buffer
    fileName.value = file.name
    info.value = meta
    title.value = meta.title
    author.value = meta.author
    subject.value = meta.subject
    keywords.value = meta.keywords
    producer.value = meta.producer
    creator.value = meta.creator
    creationDate.value = toLocalInput(meta.creationDate)
    modificationDate.value = toLocalInput(meta.modificationDate)
  } catch (err) {
    const msg = (err as Error).message
    errorMessage.value =
      msg === 'ENCRYPTED'
        ? t('metapdf.errors.encrypted')
        : t('metapdf.errors.invalidPdf', { name: file.name })
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
  fileData.value = null
  fileName.value = null
  info.value = null
  errorMessage.value = null
}

const apply = async () => {
  if (!fileData.value || !fileName.value) return
  isProcessing.value = true
  errorMessage.value = null
  try {
    const bytes = await write(fileData.value, {
      title: title.value,
      author: author.value,
      subject: subject.value,
      keywords: keywords.value,
      producer: producer.value,
      creator: creator.value,
      creationDate: fromLocalInput(creationDate.value),
      modificationDate: fromLocalInput(modificationDate.value),
    })
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const baseName = fileName.value.replace(/\.pdf$/i, '')
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName}-metadata.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    const msg = (err as Error).message
    errorMessage.value =
      msg === 'ENCRYPTED'
        ? t('metapdf.errors.encrypted')
        : t('metapdf.errors.generic')
  } finally {
    isProcessing.value = false
  }
}

const setNow = (which: 'creation' | 'modification') => {
  const now = toLocalInput(new Date())
  if (which === 'creation') creationDate.value = now
  else modificationDate.value = now
}
</script>

<template>
  <div class="metapdf">
    <div
      v-if="!fileData"
      class="dropzone"
      :class="{ active: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <p>{{ t('metapdf.dropzone') }}</p>
      <input
        ref="fileInput"
        type="file"
        accept="application/pdf,.pdf"
        hidden
        @change="onSelect"
      />
    </div>

    <div v-else class="card">
      <header class="file-header">
        <div class="meta">
          <span class="name" :title="fileName!">{{ fileName }}</span>
          <span v-if="info" class="sub">{{ t('metapdf.totalPages', { n: info.pageCount }) }}</span>
        </div>
        <button class="btn btn-ghost btn-sm" type="button" @click="clear">
          {{ t('metapdf.actions.change') }}
        </button>
      </header>

      <div class="grid">
        <label class="field grow">
          <span>{{ t('metapdf.fields.title') }}</span>
          <input v-model="title" type="text" :placeholder="t('metapdf.fields.empty')" />
        </label>
        <label class="field grow">
          <span>{{ t('metapdf.fields.author') }}</span>
          <input v-model="author" type="text" :placeholder="t('metapdf.fields.empty')" />
        </label>
        <label class="field full">
          <span>{{ t('metapdf.fields.subject') }}</span>
          <input v-model="subject" type="text" :placeholder="t('metapdf.fields.empty')" />
        </label>
        <label class="field full">
          <span>{{ t('metapdf.fields.keywords') }}</span>
          <input v-model="keywords" type="text" :placeholder="t('metapdf.fields.keywordsPlaceholder')" />
        </label>
        <p class="hint full">{{ t('metapdf.fields.keywordsHint') }}</p>
        <label class="field grow">
          <span>{{ t('metapdf.fields.creator') }}</span>
          <input v-model="creator" type="text" :placeholder="t('metapdf.fields.empty')" />
        </label>
        <label class="field grow">
          <span>{{ t('metapdf.fields.producer') }}</span>
          <input v-model="producer" type="text" :placeholder="t('metapdf.fields.empty')" />
        </label>
        <div class="field grow date-field">
          <span>{{ t('metapdf.fields.creationDate') }}</span>
          <div class="date-row">
            <input v-model="creationDate" type="datetime-local" />
            <button class="btn btn-ghost btn-sm" type="button" @click="setNow('creation')">
              {{ t('metapdf.actions.now') }}
            </button>
          </div>
        </div>
        <div class="field grow date-field">
          <span>{{ t('metapdf.fields.modificationDate') }}</span>
          <div class="date-row">
            <input v-model="modificationDate" type="datetime-local" />
            <button class="btn btn-ghost btn-sm" type="button" @click="setNow('modification')">
              {{ t('metapdf.actions.now') }}
            </button>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn" type="button" :disabled="isProcessing" @click="apply">
          {{ isProcessing ? t('metapdf.actions.processing') : t('metapdf.actions.apply') }}
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.metapdf {
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
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
@media (max-width: 600px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field.full {
  grid-column: 1 / -1;
}
.field input {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
}
.hint.full {
  grid-column: 1 / -1;
}
.date-field .date-row {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.date-field .date-row input {
  flex: 1;
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
