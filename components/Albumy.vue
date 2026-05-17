<script setup lang="ts">
import type { Orientation, PageSize } from '~/composables/useAlbumy'

interface ImageItem {
  id: string
  name: string
  size: number
  width: number
  height: number
  data: ArrayBuffer
  mime: string
}

const { t } = useI18n()
const { inspect, buildPdf } = useAlbumy()

const items = ref<ImageItem[]>([])
const pageSize = ref<PageSize>('a4')
const orientation = ref<Orientation>('portrait')
const margin = ref(20)
const quality = ref(85)
const isDragging = ref(false)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const handleFiles = async (incoming: FileList | File[]) => {
  errorMessage.value = null
  const list = Array.from(incoming)
  for (const file of list) {
    if (!file.type.startsWith('image/')) {
      errorMessage.value = t('albumy.errors.notImage', { name: file.name })
      continue
    }
    try {
      const { width, height } = await inspect(file)
      const data = await file.arrayBuffer()
      items.value.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        width,
        height,
        data,
        mime: file.type,
      })
    } catch {
      errorMessage.value = t('albumy.errors.notImage', { name: file.name })
    }
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
  if (target < 0 || target >= items.value.length) return
  const arr = [...items.value]
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
  items.value = arr
}

const remove = (index: number) => {
  items.value.splice(index, 1)
}

const clear = () => {
  items.value = []
  errorMessage.value = null
}

const canBuild = computed(() => items.value.length > 0 && !isProcessing.value)

const build = async () => {
  if (!canBuild.value) return
  isProcessing.value = true
  errorMessage.value = null
  try {
    const bytes = await buildPdf(
      items.value.map((it) => ({
        name: it.name,
        data: it.data,
        width: it.width,
        height: it.height,
        mime: it.mime,
      })),
      {
        pageSize: pageSize.value,
        orientation: orientation.value,
        margin: margin.value,
        quality: quality.value,
      },
    )
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'album.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    errorMessage.value = t('albumy.errors.generic')
  } finally {
    isProcessing.value = false
  }
}

const pageSizeOptions: PageSize[] = ['a4', 'letter', 'fit']
const orientationOptions: Orientation[] = ['portrait', 'landscape']

const showOrientation = computed(() => pageSize.value !== 'fit')
</script>

<template>
  <div class="albumy">
    <div
      class="dropzone"
      :class="{ active: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <p>{{ t('albumy.dropzone') }}</p>
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        hidden
        @change="onSelect"
      />
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div v-if="items.length > 0" class="card">
      <header class="list-header">
        <span class="list-title">
          {{ t('albumy.list.title', { count: items.length }) }}
        </span>
        <button class="btn btn-ghost btn-sm" type="button" @click="clear">
          {{ t('albumy.actions.clear') }}
        </button>
      </header>

      <ul class="file-list">
        <li v-for="(item, i) in items" :key="item.id" class="file-row">
          <span class="index">{{ i + 1 }}</span>
          <div class="meta">
            <span class="name" :title="item.name">{{ item.name }}</span>
            <span class="sub">
              {{ item.width }}×{{ item.height }} · {{ formatBytes(item.size) }}
            </span>
          </div>
          <div class="row-actions">
            <button
              class="btn-icon"
              type="button"
              :disabled="i === 0"
              :title="t('albumy.actions.moveUp')"
              @click="move(i, -1)"
            >
              ↑
            </button>
            <button
              class="btn-icon"
              type="button"
              :disabled="i === items.length - 1"
              :title="t('albumy.actions.moveDown')"
              @click="move(i, 1)"
            >
              ↓
            </button>
            <button
              class="btn-icon"
              type="button"
              :title="t('albumy.actions.remove')"
              @click="remove(i)"
            >
              ×
            </button>
          </div>
        </li>
      </ul>
    </div>

    <div v-if="items.length > 0" class="card">
      <header class="head">
        <span class="title">{{ t('albumy.options.title') }}</span>
      </header>
      <div class="row">
        <label class="field grow">
          <span>{{ t('albumy.options.pageSize') }}</span>
          <select v-model="pageSize">
            <option v-for="p in pageSizeOptions" :key="p" :value="p">
              {{ t(`albumy.options.pageSizes.${p}`) }}
            </option>
          </select>
        </label>
        <label v-if="showOrientation" class="field grow">
          <span>{{ t('albumy.options.orientation') }}</span>
          <select v-model="orientation">
            <option v-for="o in orientationOptions" :key="o" :value="o">
              {{ t(`albumy.options.orientations.${o}`) }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>{{ t('albumy.options.margin') }} (pt)</span>
          <input
            v-model.number="margin"
            type="number"
            min="0"
            max="200"
            class="num-input"
          />
        </label>
        <label class="field grow">
          <span>{{ t('albumy.options.quality') }} ({{ quality }})</span>
          <input v-model.number="quality" type="range" min="40" max="100" />
        </label>
      </div>
      <p class="hint">{{ t('albumy.options.qualityHint') }}</p>

      <div class="actions">
        <button class="btn" type="button" :disabled="!canBuild" @click="build">
          {{ isProcessing ? t('albumy.actions.processing') : t('albumy.actions.build') }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.albumy {
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
.list-header,
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.list-title,
.title {
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
  cursor: pointer;
}
.btn-icon:disabled {
  opacity: 0.35;
  cursor: not-allowed;
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
  flex: 1 1 180px;
}
.field select,
.field input {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.num-input {
  width: 5.5rem;
}
.hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
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
