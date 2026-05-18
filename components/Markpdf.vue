<script setup lang="ts">
/**
 * Markpdf.vue
 *
 * PDF dropzone, watermark text input, full set of styling controls (font
 * size, color, opacity, rotation), position selector (9 anchors plus
 * tiled), margin / tile-gap slider and a page-range input (reusing
 * `usePdfSpinner.parseRanges` for the parser). Calls `useMarkpdf.apply`
 * and triggers a download with `<original>-watermark.pdf`.
 */
import type { Position } from '~/composables/useMarkpdf'
import { POSITIONS, hexToRgb01 } from '~/composables/useMarkpdf'

const { t } = useI18n()
const { countPages, apply } = useMarkpdf()
const { parseRanges } = usePdfSpinner()

const fileName = ref<string | null>(null)
const fileData = ref<ArrayBuffer | null>(null)
const totalPages = ref(0)
const isDragging = ref(false)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const text = ref('CONFIDENTIAL')
const fontSize = ref(60)
const colorHex = ref('#808080')
const opacityPct = ref(35)
const rotation = ref(-30)
const position = ref<Position>('center')
const margin = ref(36)
const tileGap = ref(40)
const rangesInput = ref('')

const parsedPages = computed(() =>
  fileData.value && totalPages.value > 0
    ? parseRanges(rangesInput.value, totalPages.value)
    : { pages: [], invalidTokens: [], outOfRange: [] },
)

const canApply = computed(
  () =>
    !!fileData.value &&
    text.value.trim().length > 0 &&
    parsedPages.value.pages.length > 0 &&
    !isProcessing.value,
)

const summarizeRanges = (nums: number[]): string => {
  if (nums.length === 0) return ''
  const out: string[] = []
  let start = nums[0]
  let prev = nums[0]
  for (let i = 1; i <= nums.length; i++) {
    const n = nums[i]
    if (n === prev + 1) {
      prev = n
      continue
    }
    out.push(start === prev ? `${start}` : `${start}-${prev}`)
    start = n
    prev = n
  }
  return out.join(', ')
}

const loadFile = async (file: File) => {
  errorMessage.value = null
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    errorMessage.value = t('markpdf.errors.notPdf', { name: file.name })
    return
  }
  const buffer = await file.arrayBuffer()
  const pages = await countPages(buffer)
  if (pages === 0) {
    errorMessage.value = t('markpdf.errors.invalidPdf', { name: file.name })
    return
  }
  fileData.value = buffer
  fileName.value = file.name
  totalPages.value = pages
  rangesInput.value = ''
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
  totalPages.value = 0
  rangesInput.value = ''
  errorMessage.value = null
}

const run = async () => {
  if (!canApply.value || !fileData.value || !fileName.value) return
  isProcessing.value = true
  errorMessage.value = null
  try {
    const bytes = await apply(fileData.value, {
      text: text.value,
      fontSize: fontSize.value,
      color: hexToRgb01(colorHex.value),
      opacity: opacityPct.value / 100,
      rotation: rotation.value,
      position: position.value,
      pages: parsedPages.value.pages,
      margin: margin.value,
      tileGap: tileGap.value,
    })
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const baseName = fileName.value.replace(/\.pdf$/i, '')
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName}-watermark.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    const msg = (err as Error).message
    if (msg === 'ENCRYPTED') {
      errorMessage.value = t('markpdf.errors.encrypted')
    } else if (msg === 'EMPTY_TEXT') {
      errorMessage.value = t('markpdf.errors.emptyText')
    } else {
      errorMessage.value = t('markpdf.errors.generic')
    }
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <div class="markpdf">
    <div
      v-if="!fileData"
      class="dropzone"
      :class="{ active: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <p>{{ t('markpdf.dropzone') }}</p>
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
          <span class="sub">{{ t('markpdf.totalPages', { n: totalPages }) }}</span>
        </div>
        <button class="btn btn-ghost btn-sm" type="button" @click="clear">
          {{ t('markpdf.actions.change') }}
        </button>
      </header>

      <label class="field">
        <span>{{ t('markpdf.text') }}</span>
        <input v-model="text" type="text" :placeholder="t('markpdf.textPlaceholder')" />
      </label>

      <div class="row">
        <label class="field grow">
          <span>{{ t('markpdf.position') }}</span>
          <select v-model="position">
            <option v-for="p in POSITIONS" :key="p" :value="p">
              {{ t(`markpdf.positions.${p}`) }}
            </option>
          </select>
        </label>
        <label class="field grow">
          <span>{{ t('markpdf.color') }}</span>
          <input v-model="colorHex" type="color" class="color-input" />
        </label>
      </div>

      <div class="row">
        <label class="field grow">
          <span>{{ t('markpdf.fontSize') }} ({{ fontSize }}pt)</span>
          <input v-model.number="fontSize" type="range" min="8" max="200" />
        </label>
        <label class="field grow">
          <span>{{ t('markpdf.opacity') }} ({{ opacityPct }}%)</span>
          <input v-model.number="opacityPct" type="range" min="5" max="100" />
        </label>
      </div>

      <div class="row">
        <label class="field grow">
          <span>{{ t('markpdf.rotation') }} ({{ rotation }}°)</span>
          <input v-model.number="rotation" type="range" min="-180" max="180" />
        </label>
        <label v-if="position !== 'tiled'" class="field grow">
          <span>{{ t('markpdf.margin') }} ({{ margin }}pt)</span>
          <input v-model.number="margin" type="range" min="0" max="200" />
        </label>
        <label v-else class="field grow">
          <span>{{ t('markpdf.tileGap') }} ({{ tileGap }}pt)</span>
          <input v-model.number="tileGap" type="range" min="0" max="200" />
        </label>
      </div>

      <label class="field">
        <span>{{ t('markpdf.rangesLabel') }}</span>
        <input
          v-model="rangesInput"
          type="text"
          :placeholder="t('markpdf.rangesPlaceholder', { max: totalPages })"
        />
      </label>
      <p class="hint">{{ t('markpdf.rangesHint') }}</p>

      <div class="preview">
        <div class="preview-row">
          <span class="preview-label">{{ t('markpdf.preview.pages') }}</span>
          <span class="preview-value">
            {{
              parsedPages.pages.length > 0
                ? summarizeRanges(parsedPages.pages)
                : t('markpdf.preview.none')
            }}
          </span>
        </div>
        <div class="preview-row">
          <span class="preview-label">{{ t('markpdf.preview.count') }}</span>
          <span class="preview-value">{{ parsedPages.pages.length }}</span>
        </div>
        <p v-if="parsedPages.invalidTokens.length > 0" class="warn">
          {{
            t('markpdf.errors.invalidTokens', {
              tokens: parsedPages.invalidTokens.join(', '),
            })
          }}
        </p>
        <p v-if="parsedPages.outOfRange.length > 0" class="warn">
          {{
            t('markpdf.errors.outOfRange', {
              tokens: parsedPages.outOfRange.join(', '),
              max: totalPages,
            })
          }}
        </p>
      </div>

      <div class="actions">
        <button class="btn" type="button" :disabled="!canApply" @click="run">
          {{
            isProcessing
              ? t('markpdf.actions.processing')
              : t('markpdf.actions.apply')
          }}
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.markpdf {
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
.field input[type='text'],
.field input[type='range'] {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.field input[type='range'] {
  padding: 0;
}
.color-input {
  height: 2.6rem;
  padding: 0.2rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  cursor: pointer;
}
.hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
}
.preview {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.7rem 0.85rem;
}
.preview-row {
  display: flex;
  gap: 0.6rem;
  align-items: baseline;
  flex-wrap: wrap;
}
.preview-label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  min-width: 6rem;
}
.preview-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.92rem;
  word-break: break-all;
}
.warn {
  color: #b58300;
  margin: 0;
  font-size: 0.85rem;
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
