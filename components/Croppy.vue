<script setup lang="ts">
/**
 * Croppy.vue
 *
 * Image dropzone + interactive crop selection. The selection is stored
 * in source pixels and rendered over a display canvas that's been
 * scaled to fit the viewport. Drag on empty space draws a new
 * rectangle; drag the rectangle body to move; drag any corner handle
 * to resize. An aspect-ratio dropdown locks the new dimensions, and
 * four numeric inputs let the user dial exact pixel values.
 *
 * Cropping itself is bit-perfect (see `useCroppy.cropToCanvas`); the
 * only quality concern is re-encoding, so the format dropdown defaults
 * to whatever the source file used.
 */
import type { OutputFormat, Rect } from '~/composables/useCroppy'
import {
  ASPECT_PRESETS,
  FORMATS,
  defaultFormatFor,
} from '~/composables/useCroppy'

const { t } = useI18n()
const { loadBitmap, cropToCanvas, exportBlob, extFor, normalize } = useCroppy()

interface LoadedImage {
  file: File
  bitmap: ImageBitmap
  width: number
  height: number
  size: number
}

type DragMode =
  | 'none'
  | 'create'
  | 'move'
  | 'resize-nw'
  | 'resize-ne'
  | 'resize-se'
  | 'resize-sw'

const loaded = ref<LoadedImage | null>(null)
const isDragging = ref(false)
const isProcessing = ref(false)
const errorMessage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const previewRef = ref<HTMLCanvasElement | null>(null)
const outputRef = ref<HTMLCanvasElement | null>(null)

const selection = ref<Rect>({ x: 0, y: 0, w: 0, h: 0 })
const dragMode = ref<DragMode>('none')
const dragAnchor = ref<{ x: number; y: number } | null>(null)
const dragOffset = ref<{ dx: number; dy: number } | null>(null)
const displaySize = ref<{ w: number; h: number } | null>(null)

const aspectId = ref('free')
const aspectRatio = computed(() => {
  const preset = ASPECT_PRESETS.find((p) => p.id === aspectId.value)
  return preset?.ratio ?? null
})

const format = ref<OutputFormat>('png')
const quality = ref(92)
const showQuality = computed(
  () => format.value === 'jpeg' || format.value === 'webp',
)

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const drawPreview = () => {
  if (!loaded.value || !previewRef.value) return
  const c = previewRef.value
  c.width = loaded.value.width
  c.height = loaded.value.height
  const ctx = c.getContext('2d')
  if (!ctx) return
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(loaded.value.bitmap, 0, 0)
}

const drawOutput = () => {
  if (!loaded.value || !outputRef.value) return
  try {
    cropToCanvas(outputRef.value, loaded.value.bitmap, selection.value)
  } catch {
    /* ignore — empty crop simply leaves the previous canvas */
  }
}

const measureDisplay = () => {
  if (!previewRef.value) return
  const rect = previewRef.value.getBoundingClientRect()
  displaySize.value = { w: rect.width, h: rect.height }
}

const clientToSource = (
  e: PointerEvent,
): { x: number; y: number } | null => {
  if (!previewRef.value) return null
  const rect = previewRef.value.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  const scaleX = previewRef.value.width / rect.width
  const scaleY = previewRef.value.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

const HANDLE_HIT_PX = 16 // source-pixel radius for handle hit-tests

const hitHandle = (pt: { x: number; y: number }): DragMode | null => {
  const s = selection.value
  if (s.w === 0 || s.h === 0) return null
  const r = HANDLE_HIT_PX
  const corners: { dx: number; dy: number; mode: DragMode }[] = [
    { dx: s.x, dy: s.y, mode: 'resize-nw' },
    { dx: s.x + s.w, dy: s.y, mode: 'resize-ne' },
    { dx: s.x + s.w, dy: s.y + s.h, mode: 'resize-se' },
    { dx: s.x, dy: s.y + s.h, mode: 'resize-sw' },
  ]
  for (const c of corners) {
    if (Math.abs(pt.x - c.dx) <= r && Math.abs(pt.y - c.dy) <= r) {
      return c.mode
    }
  }
  return null
}

const insideSelection = (pt: { x: number; y: number }): boolean => {
  const s = selection.value
  return pt.x >= s.x && pt.x <= s.x + s.w && pt.y >= s.y && pt.y <= s.y + s.h
}

/**
 * Apply the aspect-ratio lock to a width/height candidate by keeping
 * whichever dimension is bigger and recomputing the other.
 */
const applyAspect = (w: number, h: number): { w: number; h: number } => {
  const ratio = aspectRatio.value
  if (!ratio || w === 0 || h === 0) return { w, h }
  const aw = Math.abs(w)
  const ah = Math.abs(h)
  if (aw / ah > ratio) {
    return { w, h: Math.sign(h || 1) * (aw / ratio) }
  }
  return { w: Math.sign(w || 1) * (ah * ratio), h }
}

const onPointerDown = (e: PointerEvent) => {
  if (!loaded.value || !previewRef.value) return
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  measureDisplay()
  const pt = clientToSource(e)
  if (!pt) return

  const handle = hitHandle(pt)
  if (handle) {
    dragMode.value = handle
    const s = selection.value
    const anchor =
      handle === 'resize-nw'
        ? { x: s.x + s.w, y: s.y + s.h }
        : handle === 'resize-ne'
          ? { x: s.x, y: s.y + s.h }
          : handle === 'resize-se'
            ? { x: s.x, y: s.y }
            : { x: s.x + s.w, y: s.y }
    dragAnchor.value = anchor
    return
  }
  if (insideSelection(pt)) {
    dragMode.value = 'move'
    dragOffset.value = { dx: pt.x - selection.value.x, dy: pt.y - selection.value.y }
    return
  }
  // Create new selection from this point.
  dragMode.value = 'create'
  dragAnchor.value = { x: pt.x, y: pt.y }
  selection.value = { x: pt.x, y: pt.y, w: 0, h: 0 }
}

const onPointerMove = (e: PointerEvent) => {
  if (dragMode.value === 'none' || !loaded.value) return
  const pt = clientToSource(e)
  if (!pt) return
  const bounds = { w: loaded.value.width, h: loaded.value.height }

  if (dragMode.value === 'move' && dragOffset.value) {
    let nx = pt.x - dragOffset.value.dx
    let ny = pt.y - dragOffset.value.dy
    nx = Math.max(0, Math.min(bounds.w - selection.value.w, nx))
    ny = Math.max(0, Math.min(bounds.h - selection.value.h, ny))
    selection.value = { ...selection.value, x: nx, y: ny }
    drawOutput()
    return
  }

  if (dragAnchor.value) {
    const a = dragAnchor.value
    let w = pt.x - a.x
    let h = pt.y - a.y
    const ar = applyAspect(w, h)
    w = ar.w
    h = ar.h
    selection.value = {
      x: Math.min(a.x, a.x + w),
      y: Math.min(a.y, a.y + h),
      w: Math.abs(w),
      h: Math.abs(h),
    }
    drawOutput()
  }
}

const onPointerUp = (e: PointerEvent) => {
  if (dragMode.value === 'none' || !loaded.value) return
  ;(e.currentTarget as Element).releasePointerCapture?.(e.pointerId)
  selection.value = normalize(selection.value, {
    w: loaded.value.width,
    h: loaded.value.height,
  })
  dragMode.value = 'none'
  dragAnchor.value = null
  dragOffset.value = null
  drawOutput()
}

const resetSelection = () => {
  if (!loaded.value) return
  const w = loaded.value.width
  const h = loaded.value.height
  let cropW = w
  let cropH = h
  const ratio = aspectRatio.value
  if (ratio) {
    if (w / h > ratio) {
      cropW = h * ratio
    } else {
      cropH = w / ratio
    }
  }
  selection.value = {
    x: (w - cropW) / 2,
    y: (h - cropH) / 2,
    w: cropW,
    h: cropH,
  }
  drawOutput()
}

watch(aspectRatio, () => {
  if (!loaded.value) return
  if (aspectRatio.value === null) return
  resetSelection()
})

const loadFile = async (file: File) => {
  errorMessage.value = null
  if (!file.type.startsWith('image/')) {
    errorMessage.value = t('croppy.errors.notImage', { name: file.name })
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
    format.value = defaultFormatFor(file.type)
    await nextTick()
    drawPreview()
    measureDisplay()
    resetSelection()
  } catch {
    errorMessage.value = t('croppy.errors.notImage', { name: file.name })
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
  selection.value = { x: 0, y: 0, w: 0, h: 0 }
}

// Numeric input bindings (rounded source pixels).
const numX = computed({
  get: () => Math.round(selection.value.x),
  set: (v) => updateSelection({ x: Number(v) }),
})
const numY = computed({
  get: () => Math.round(selection.value.y),
  set: (v) => updateSelection({ y: Number(v) }),
})
const numW = computed({
  get: () => Math.round(selection.value.w),
  set: (v) => updateSelection({ w: Number(v) }),
})
const numH = computed({
  get: () => Math.round(selection.value.h),
  set: (v) => updateSelection({ h: Number(v) }),
})

const updateSelection = (patch: Partial<Rect>) => {
  if (!loaded.value) return
  const next = normalize({ ...selection.value, ...patch }, {
    w: loaded.value.width,
    h: loaded.value.height,
  })
  selection.value = next
  drawOutput()
}

const selectionStyle = computed(() => {
  if (!previewRef.value || !displaySize.value) return {}
  const scaleX = displaySize.value.w / previewRef.value.width
  const scaleY = displaySize.value.h / previewRef.value.height
  return {
    left: `${selection.value.x * scaleX}px`,
    top: `${selection.value.y * scaleY}px`,
    width: `${selection.value.w * scaleX}px`,
    height: `${selection.value.h * scaleY}px`,
  }
})

const download = async () => {
  if (!loaded.value || !outputRef.value) return
  isProcessing.value = true
  errorMessage.value = null
  try {
    const blob = await exportBlob(outputRef.value, format.value, quality.value)
    const baseName = loaded.value.file.name.replace(/\.[^/.]+$/, '')
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName}-croppy.${extFor(format.value)}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    errorMessage.value = t('croppy.errors.generic')
  } finally {
    isProcessing.value = false
  }
}

onMounted(() => {
  window.addEventListener('resize', measureDisplay)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', measureDisplay)
})
</script>

<template>
  <div class="croppy">
    <div
      v-if="!loaded"
      class="dropzone"
      :class="{ active: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <p>{{ t('croppy.dropzone') }}</p>
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
            {{ t('croppy.actions.change') }}
          </button>
        </header>
      </div>

      <div class="preview-card">
        <div
          class="canvas-wrap"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <canvas ref="previewRef" class="preview" />
          <div
            v-if="selection.w > 0"
            class="selection"
            :style="selectionStyle"
          >
            <span class="handle h-nw" />
            <span class="handle h-ne" />
            <span class="handle h-se" />
            <span class="handle h-sw" />
          </div>
        </div>
        <p class="hint">{{ t('croppy.hint') }}</p>
      </div>

      <div class="card">
        <div class="row">
          <label class="field grow">
            <span>{{ t('croppy.aspect.label') }}</span>
            <select v-model="aspectId">
              <option v-for="p in ASPECT_PRESETS" :key="p.id" :value="p.id">
                {{ t(`croppy.aspect.${p.id}`) }}
              </option>
            </select>
          </label>
          <button class="btn btn-ghost btn-sm reset-btn" type="button" @click="resetSelection">
            {{ t('croppy.actions.reset') }}
          </button>
        </div>

        <div class="row">
          <label class="field">
            <span>X</span>
            <input v-model.number="numX" type="number" min="0" />
          </label>
          <label class="field">
            <span>Y</span>
            <input v-model.number="numY" type="number" min="0" />
          </label>
          <label class="field">
            <span>{{ t('croppy.dim.width') }}</span>
            <input v-model.number="numW" type="number" min="8" />
          </label>
          <label class="field">
            <span>{{ t('croppy.dim.height') }}</span>
            <input v-model.number="numH" type="number" min="8" />
          </label>
        </div>

        <div class="row">
          <label class="field grow">
            <span>{{ t('croppy.format.label') }}</span>
            <select v-model="format">
              <option v-for="f in FORMATS" :key="f" :value="f">
                {{ t(`croppy.format.${f}`) }}
              </option>
            </select>
          </label>
          <label v-if="showQuality" class="field grow">
            <span>{{ t('croppy.format.quality') }} ({{ quality }})</span>
            <input v-model.number="quality" type="range" min="40" max="100" />
          </label>
        </div>

        <p v-if="format === 'png'" class="hint">{{ t('croppy.quality.lossless') }}</p>
        <p v-else class="hint">{{ t('croppy.quality.lossy') }}</p>

        <div class="actions">
          <button class="btn" type="button" :disabled="isProcessing" @click="download">
            {{ isProcessing ? t('croppy.actions.processing') : t('croppy.actions.download') }}
          </button>
        </div>
      </div>

      <canvas ref="outputRef" class="hidden-canvas" />
    </template>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.croppy {
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
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  overflow: hidden;
}
.canvas-wrap {
  position: relative;
  max-width: 100%;
  display: inline-block;
  user-select: none;
  touch-action: none;
  cursor: crosshair;
}
.preview {
  max-width: 100%;
  max-height: 32rem;
  height: auto;
  display: block;
  background: #111;
}
.selection {
  position: absolute;
  border: 2px dashed var(--accent, #c75a3a);
  background: rgba(199, 90, 58, 0.12);
  cursor: move;
  box-sizing: border-box;
}
.handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: #fff;
  border: 2px solid var(--accent, #c75a3a);
  border-radius: 2px;
}
.h-nw {
  left: -7px;
  top: -7px;
  cursor: nwse-resize;
}
.h-ne {
  right: -7px;
  top: -7px;
  cursor: nesw-resize;
}
.h-se {
  right: -7px;
  bottom: -7px;
  cursor: nwse-resize;
}
.h-sw {
  left: -7px;
  bottom: -7px;
  cursor: nesw-resize;
}
.row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field.grow {
  flex: 1 1 220px;
}
.field input,
.field select {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.field input[type='range'] {
  padding: 0;
}
.field input[type='number'] {
  width: 7rem;
}
.reset-btn {
  align-self: flex-end;
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
.hidden-canvas {
  display: none;
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
