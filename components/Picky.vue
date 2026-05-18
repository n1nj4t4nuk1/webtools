<script setup lang="ts">
import type { Pick } from '~/composables/usePicky'

const { t } = useI18n()
const { loadBitmap, drawToCanvas, sampleAverage } = usePicky()

interface LoadedImage {
  file: File
  bitmap: ImageBitmap
  width: number
  height: number
}

const loaded = ref<LoadedImage | null>(null)
const isDragging = ref(false)
const errorMessage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const wrapRef = ref<HTMLDivElement | null>(null)
const displaySize = ref<{ w: number; h: number } | null>(null)

const hovered = ref<Pick | null>(null)
const picked = ref<Pick | null>(null)
const history = ref<Pick[]>([])
const radius = ref(0)
const copiedKey = ref<string | null>(null)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const measureDisplay = () => {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  displaySize.value = { w: rect.width, h: rect.height }
}

const clientToImage = (
  e: PointerEvent,
): { x: number; y: number } | null => {
  if (!canvasRef.value) return null
  const rect = canvasRef.value.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  const scaleX = canvasRef.value.width / rect.width
  const scaleY = canvasRef.value.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

const onPointerMove = (e: PointerEvent) => {
  if (!loaded.value || !canvasRef.value) return
  const pt = clientToImage(e)
  if (!pt) return
  hovered.value = sampleAverage(canvasRef.value, pt.x, pt.y, radius.value)
}

const onPointerLeave = () => {
  hovered.value = null
}

const onClick = (e: PointerEvent) => {
  if (!loaded.value || !canvasRef.value) return
  const pt = clientToImage(e)
  if (!pt) return
  const p = sampleAverage(canvasRef.value, pt.x, pt.y, radius.value)
  if (!p) return
  picked.value = p
  history.value = [
    p,
    ...history.value.filter((h) => h.hex !== p.hex),
  ].slice(0, 12)
}

const cursorStyle = computed(() => {
  if (!hovered.value || !canvasRef.value || !displaySize.value) return {}
  const scaleX = displaySize.value.w / canvasRef.value.width
  const scaleY = displaySize.value.h / canvasRef.value.height
  return {
    left: `${hovered.value.x * scaleX}px`,
    top: `${hovered.value.y * scaleY}px`,
  }
})

onMounted(() => {
  window.addEventListener('resize', measureDisplay)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', measureDisplay)
  if (copiedTimer) clearTimeout(copiedTimer)
})

const loadFile = async (file: File) => {
  errorMessage.value = null
  if (!file.type.startsWith('image/')) {
    errorMessage.value = t('picky.errors.notImage', { name: file.name })
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
    }
    picked.value = null
    hovered.value = null
    history.value = []
    await nextTick()
    if (canvasRef.value) drawToCanvas(bitmap, canvasRef.value)
    measureDisplay()
  } catch {
    errorMessage.value = t('picky.errors.notImage', { name: file.name })
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
  picked.value = null
  hovered.value = null
  history.value = []
  errorMessage.value = null
}

const rgbString = (p: Pick) => `rgb(${p.rgb.r}, ${p.rgb.g}, ${p.rgb.b})`
const hslString = (p: Pick) => `hsl(${p.hsl.h}, ${p.hsl.s}%, ${p.hsl.l}%)`

const copy = async (value: string, key: string) => {
  try {
    await navigator.clipboard.writeText(value)
    copiedKey.value = key
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copiedKey.value = null
    }, 1200)
  } catch {
    /* ignore */
  }
}

const selectFromHistory = (p: Pick) => {
  picked.value = p
}
</script>

<template>
  <div class="picky">
    <div
      v-if="!loaded"
      class="dropzone"
      :class="{ active: isDragging }"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
      @click="fileInput?.click()"
    >
      <p>{{ t('picky.dropzone') }}</p>
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
            <span class="sub">{{ loaded.width }}×{{ loaded.height }}</span>
          </div>
          <button class="btn btn-ghost btn-sm" type="button" @click="clear">
            {{ t('picky.actions.change') }}
          </button>
        </header>
      </div>

      <div class="preview-card">
        <div
          ref="wrapRef"
          class="canvas-wrap"
          @pointermove="onPointerMove"
          @pointerleave="onPointerLeave"
          @click="onClick"
        >
          <canvas ref="canvasRef" class="preview" />
          <div v-if="hovered" class="cursor-dot" :style="cursorStyle" />
        </div>

        <div class="controls">
          <label class="field">
            <span>{{ t('picky.radius') }} ({{ radius }}px)</span>
            <input v-model.number="radius" type="range" min="0" max="20" />
          </label>
          <p class="hint">{{ t('picky.hint') }}</p>
        </div>
      </div>

      <div v-if="hovered || picked" class="card swatch-row">
        <div v-if="hovered" class="swatch-block">
          <span class="label">{{ t('picky.hover') }}</span>
          <div class="swatch" :style="{ background: hovered.hex }" />
          <code class="mono">{{ hovered.hex }}</code>
        </div>
        <div v-if="picked" class="swatch-block picked">
          <span class="label">{{ t('picky.picked') }}</span>
          <div class="swatch" :style="{ background: picked.hex }" />
          <div class="values">
            <button
              class="value-btn"
              type="button"
              :title="t('picky.actions.copy')"
              @click="copy(picked.hex, 'hex')"
            >
              <span class="value-label">HEX</span>
              <code class="mono">{{ picked.hex }}</code>
              <span v-if="copiedKey === 'hex'" class="copied">{{ t('picky.actions.copied') }}</span>
            </button>
            <button
              class="value-btn"
              type="button"
              :title="t('picky.actions.copy')"
              @click="copy(rgbString(picked), 'rgb')"
            >
              <span class="value-label">RGB</span>
              <code class="mono">{{ rgbString(picked) }}</code>
              <span v-if="copiedKey === 'rgb'" class="copied">{{ t('picky.actions.copied') }}</span>
            </button>
            <button
              class="value-btn"
              type="button"
              :title="t('picky.actions.copy')"
              @click="copy(hslString(picked), 'hsl')"
            >
              <span class="value-label">HSL</span>
              <code class="mono">{{ hslString(picked) }}</code>
              <span v-if="copiedKey === 'hsl'" class="copied">{{ t('picky.actions.copied') }}</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="history.length" class="card">
        <span class="label">{{ t('picky.history') }}</span>
        <div class="history">
          <button
            v-for="(p, i) in history"
            :key="`${p.hex}-${i}`"
            class="swatch-chip"
            type="button"
            :style="{ background: p.hex }"
            :title="p.hex"
            @click="selectFromHistory(p)"
          />
        </div>
      </div>
    </template>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.picky {
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
  gap: 0.85rem;
}
.canvas-wrap {
  position: relative;
  max-width: 100%;
  display: inline-block;
  cursor: crosshair;
  user-select: none;
  touch-action: none;
}
.preview {
  max-width: 100%;
  max-height: 32rem;
  height: auto;
  display: block;
}
.cursor-dot {
  position: absolute;
  width: 14px;
  height: 14px;
  margin-left: -7px;
  margin-top: -7px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.7);
  pointer-events: none;
}
.controls {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field input[type='range'] {
  padding: 0;
}
.hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--muted);
}
.swatch-row {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 1rem;
}
.swatch-block {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  flex: 1 1 200px;
  min-width: 0;
}
.swatch-block.picked {
  flex: 2 1 320px;
}
.label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
  font-weight: 600;
}
.swatch {
  width: 100%;
  height: 3.5rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
}
.values {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.value-btn {
  display: grid;
  grid-template-columns: 3rem 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 0.12s;
}
.value-btn:hover {
  background: var(--surface);
}
.value-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--muted);
  letter-spacing: 0.06em;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.copied {
  font-size: 0.72rem;
  color: var(--accent, #c75a3a);
}
.history {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.swatch-chip {
  width: 2rem;
  height: 2rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  cursor: pointer;
  padding: 0;
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
