<script setup lang="ts">
/**
 * PdfScissor.vue (Scissor)
 *
 * PDF dropzone, page-range input that updates a live preview of the
 * resolved page numbers, and an Extract button that emits a new PDF with
 * the selected pages via `usePdfSplit.extractPages`. Surfaces invalid /
 * out-of-range tokens as warnings without blocking submission.
 */
const { t } = useI18n()
const { parseRanges, extractPages, countPages } = usePdfSplit()

const fileName = ref<string | null>(null)
const fileData = ref<ArrayBuffer | null>(null)
const totalPages = ref(0)
const rangesInput = ref('')
const isDragging = ref(false)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const parsed = computed(() =>
  fileData.value && totalPages.value > 0
    ? parseRanges(rangesInput.value, totalPages.value)
    : { pages: [], invalidTokens: [], outOfRange: [] },
)

const canExtract = computed(
  () => parsed.value.pages.length > 0 && !isProcessing.value,
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
    errorMessage.value = t('scissor.errors.notPdf', { name: file.name })
    return
  }
  const buffer = await file.arrayBuffer()
  const pages = await countPages(buffer)
  if (pages === 0) {
    errorMessage.value = t('scissor.errors.invalidPdf', { name: file.name })
    return
  }
  fileData.value = buffer
  fileName.value = file.name
  totalPages.value = pages
  rangesInput.value = `1-${pages}`
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

const extract = async () => {
  if (!canExtract.value || !fileData.value || !fileName.value) return
  isProcessing.value = true
  errorMessage.value = null
  try {
    const bytes = await extractPages(fileData.value, parsed.value.pages)
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const baseName = fileName.value.replace(/\.pdf$/i, '')
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName}-extracted.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (err) {
    const msg = (err as Error).message
    if (msg === 'ENCRYPTED') {
      errorMessage.value = t('scissor.errors.encrypted')
    } else {
      errorMessage.value = t('scissor.errors.generic')
    }
  } finally {
    isProcessing.value = false
  }
}
</script>

<template>
  <div class="scissor">
    <div
      v-if="!fileData"
      class="dropzone"
      :class="{ active: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <p>{{ t('scissor.dropzone') }}</p>
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
          <span class="sub">{{ t('scissor.totalPages', { n: totalPages }) }}</span>
        </div>
        <button class="btn btn-ghost btn-sm" type="button" @click="clear">
          {{ t('scissor.actions.change') }}
        </button>
      </header>

      <label class="field">
        <span>{{ t('scissor.rangesLabel') }}</span>
        <input
          v-model="rangesInput"
          type="text"
          :placeholder="t('scissor.rangesPlaceholder')"
        />
      </label>
      <p class="hint">{{ t('scissor.hint') }}</p>

      <div class="preview">
        <div class="preview-row">
          <span class="preview-label">{{ t('scissor.preview.pages') }}</span>
          <span class="preview-value">
            {{
              parsed.pages.length > 0
                ? summarizeRanges(parsed.pages)
                : t('scissor.preview.none')
            }}
          </span>
        </div>
        <div class="preview-row">
          <span class="preview-label">{{ t('scissor.preview.count') }}</span>
          <span class="preview-value">{{ parsed.pages.length }}</span>
        </div>
        <p v-if="parsed.invalidTokens.length > 0" class="warn">
          {{
            t('scissor.errors.invalidTokens', {
              tokens: parsed.invalidTokens.join(', '),
            })
          }}
        </p>
        <p v-if="parsed.outOfRange.length > 0" class="warn">
          {{
            t('scissor.errors.outOfRange', {
              tokens: parsed.outOfRange.join(', '),
              max: totalPages,
            })
          }}
        </p>
      </div>

      <div class="actions">
        <button class="btn" type="button" :disabled="!canExtract" @click="extract">
          {{
            isProcessing
              ? t('scissor.actions.processing')
              : t('scissor.actions.extract')
          }}
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.scissor {
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
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field input {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
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
