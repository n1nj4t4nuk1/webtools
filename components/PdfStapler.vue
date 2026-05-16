<script setup lang="ts">
interface PdfFile {
  id: string
  name: string
  size: number
  pages: number
  data: ArrayBuffer
}

const { t } = useI18n()
const { mergePdfs, countPages } = usePdfMerge()

const files = ref<PdfFile[]>([])
const isDragging = ref(false)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const totalPages = computed(() => files.value.reduce((acc, f) => acc + f.pages, 0))
const canMerge = computed(() => files.value.length >= 2 && !isProcessing.value)

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const handleFiles = async (incoming: FileList | File[]) => {
  errorMessage.value = null
  const list = Array.from(incoming)
  for (const file of list) {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      errorMessage.value = t('stapler.errors.notPdf', { name: file.name })
      continue
    }
    const buffer = await file.arrayBuffer()
    const pages = await countPages(buffer)
    if (pages === 0) {
      errorMessage.value = t('stapler.errors.invalidPdf', { name: file.name })
      continue
    }
    files.value.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      size: file.size,
      pages,
      data: buffer,
    })
  }
}

const onDrop = (event: DragEvent) => {
  isDragging.value = false
  if (event.dataTransfer?.files) handleFiles(event.dataTransfer.files)
}

const onSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) handleFiles(target.files)
  target.value = ''
}

const move = (index: number, delta: number) => {
  const target = index + delta
  if (target < 0 || target >= files.value.length) return
  const arr = [...files.value]
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
  files.value = arr
}

const remove = (index: number) => {
  files.value.splice(index, 1)
}

const clear = () => {
  files.value = []
  errorMessage.value = null
}

const merge = async () => {
  if (!canMerge.value) return
  isProcessing.value = true
  errorMessage.value = null
  try {
    const bytes = await mergePdfs(
      files.value.map((f) => ({ name: f.name, data: f.data })),
    )
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'merged.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    const msg = (err as Error).message
    if (msg.startsWith('ENCRYPTED:')) {
      errorMessage.value = t('stapler.errors.encrypted', { name: msg.slice(10) })
    } else if (msg.startsWith('INVALID_PDF:')) {
      errorMessage.value = t('stapler.errors.invalidPdf', { name: msg.slice(12) })
    } else {
      errorMessage.value = t('stapler.errors.generic')
    }
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <div class="stapler">
    <div
      class="dropzone"
      :class="{ active: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <p>{{ t('stapler.dropzone') }}</p>
      <input
        ref="fileInput"
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        @change="onSelect"
      />
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-if="files.length > 0" class="card">
      <header class="list-header">
        <span class="list-title">
          {{ t('stapler.list.title', { count: files.length, pages: totalPages }) }}
        </span>
        <button class="btn btn-ghost btn-sm" type="button" @click="clear">
          {{ t('stapler.actions.clear') }}
        </button>
      </header>

      <ul class="file-list">
        <li v-for="(file, i) in files" :key="file.id" class="file-row">
          <span class="index">{{ i + 1 }}</span>
          <div class="meta">
            <span class="name" :title="file.name">{{ file.name }}</span>
            <span class="sub">
              {{ t('stapler.list.pages', { n: file.pages }) }} · {{ formatSize(file.size) }}
            </span>
          </div>
          <div class="row-actions">
            <button
              class="btn-icon"
              type="button"
              :disabled="i === 0"
              :title="t('stapler.actions.moveUp')"
              @click="move(i, -1)"
            >
              ↑
            </button>
            <button
              class="btn-icon"
              type="button"
              :disabled="i === files.length - 1"
              :title="t('stapler.actions.moveDown')"
              @click="move(i, 1)"
            >
              ↓
            </button>
            <button
              class="btn-icon"
              type="button"
              :title="t('stapler.actions.remove')"
              @click="remove(i)"
            >
              ×
            </button>
          </div>
        </li>
      </ul>

      <div class="actions">
        <button class="btn" type="button" :disabled="!canMerge" @click="merge">
          {{ isProcessing ? t('stapler.actions.processing') : t('stapler.actions.merge') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stapler {
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
.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.list-title {
  font-weight: 600;
  font-size: 0.95rem;
}
.file-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.file-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 0.75rem;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.index {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
  color: var(--muted);
  min-width: 1.6rem;
  text-align: center;
}
.meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.name {
  font-size: 0.92rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sub {
  font-size: 0.78rem;
  color: var(--muted);
}
.row-actions {
  display: inline-flex;
  gap: 0.25rem;
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
