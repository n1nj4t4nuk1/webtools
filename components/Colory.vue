<script setup lang="ts">
/**
 * Colory.vue
 *
 * Color workbench built around a single source color. Renders a color
 * picker, synchronised HEX/RGB/HSL inputs, an 11-stop tonal palette and
 * WCAG contrast ratios against pure white and pure black. Uses the helpers
 * from `useColory` and never holds state for the derived representations —
 * they are recomputed on every change.
 */
import { hexToRgb, rgbToHex, rgbToHsl, hslToRgb } from '~/composables/useColory'

const { t } = useI18n()
const { contrastRatio, generatePalette } = useColory()

const hex = ref('#c75a3a')
const copiedKey = ref<string | null>(null)

const rgb = computed(() => hexToRgb(hex.value) ?? { r: 0, g: 0, b: 0 })
const hsl = computed(() => rgbToHsl(rgb.value))
const palette = computed(() => generatePalette(hex.value, 11))

const onHexInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  if (hexToRgb(value)) hex.value = value.startsWith('#') ? value : `#${value}`
}

const updateRgb = (channel: 'r' | 'g' | 'b', value: number) => {
  const v = Math.max(0, Math.min(255, Math.round(value || 0)))
  hex.value = rgbToHex({ ...rgb.value, [channel]: v })
}

const updateHsl = (channel: 'h' | 's' | 'l', value: number) => {
  const v = Math.max(0, Math.min(channel === 'h' ? 360 : 100, Math.round(value || 0)))
  hex.value = rgbToHex(hslToRgb({ ...hsl.value, [channel]: v }))
}

const ratioWhite = computed(() => contrastRatio(rgb.value, { r: 255, g: 255, b: 255 }))
const ratioBlack = computed(() => contrastRatio(rgb.value, { r: 0, g: 0, b: 0 }))

const wcagLevel = (ratio: number, large: boolean): 'AAA' | 'AA' | '—' => {
  if (large) {
    if (ratio >= 4.5) return 'AAA'
    if (ratio >= 3) return 'AA'
    return '—'
  }
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  return '—'
}

const copy = async (text: string, key: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = null
    }, 1500)
  } catch {
    // silent
  }
}

const rgbString = computed(() => `rgb(${rgb.value.r}, ${rgb.value.g}, ${rgb.value.b})`)
const hslString = computed(() => `hsl(${hsl.value.h}, ${hsl.value.s}%, ${hsl.value.l}%)`)
</script>

<template>
  <div class="colory">
    <div class="main-row">
      <label class="big-swatch" :style="{ background: hex }">
        <input v-model="hex" type="color" class="hidden-picker" />
      </label>

      <div class="formats card">
        <div class="format-row">
          <label class="field grow">
            <span>HEX</span>
            <input :value="hex" type="text" class="mono" maxlength="7" @input="onHexInput" />
          </label>
          <button class="btn btn-ghost btn-sm" type="button" @click="copy(hex, 'hex')">
            {{ copiedKey === 'hex' ? t('colory.actions.copied') : t('colory.actions.copy') }}
          </button>
        </div>
        <div class="format-row">
          <span class="format-label">RGB</span>
          <div class="rgb-row">
            <input
              :value="rgb.r"
              type="number"
              min="0"
              max="255"
              class="num"
              @input="updateRgb('r', +(($event.target as HTMLInputElement).value))"
            />
            <input
              :value="rgb.g"
              type="number"
              min="0"
              max="255"
              class="num"
              @input="updateRgb('g', +(($event.target as HTMLInputElement).value))"
            />
            <input
              :value="rgb.b"
              type="number"
              min="0"
              max="255"
              class="num"
              @input="updateRgb('b', +(($event.target as HTMLInputElement).value))"
            />
          </div>
          <button class="btn btn-ghost btn-sm" type="button" @click="copy(rgbString, 'rgb')">
            {{ copiedKey === 'rgb' ? t('colory.actions.copied') : t('colory.actions.copy') }}
          </button>
        </div>
        <div class="format-row">
          <span class="format-label">HSL</span>
          <div class="rgb-row">
            <input
              :value="hsl.h"
              type="number"
              min="0"
              max="360"
              class="num"
              @input="updateHsl('h', +(($event.target as HTMLInputElement).value))"
            />
            <input
              :value="hsl.s"
              type="number"
              min="0"
              max="100"
              class="num"
              @input="updateHsl('s', +(($event.target as HTMLInputElement).value))"
            />
            <input
              :value="hsl.l"
              type="number"
              min="0"
              max="100"
              class="num"
              @input="updateHsl('l', +(($event.target as HTMLInputElement).value))"
            />
          </div>
          <button class="btn btn-ghost btn-sm" type="button" @click="copy(hslString, 'hsl')">
            {{ copiedKey === 'hsl' ? t('colory.actions.copied') : t('colory.actions.copy') }}
          </button>
        </div>
      </div>
    </div>

    <div class="card">
      <header class="head">
        <span class="title">{{ t('colory.palette') }}</span>
      </header>
      <div class="palette">
        <button
          v-for="shade in palette"
          :key="shade"
          type="button"
          class="swatch"
          :style="{ background: shade }"
          :title="shade"
          @click="copy(shade, `swatch-${shade}`)"
        >
          <span class="swatch-label mono">{{ shade }}</span>
        </button>
      </div>
    </div>

    <div class="card">
      <header class="head">
        <span class="title">{{ t('colory.contrast.label') }}</span>
      </header>
      <div class="contrast-grid">
        <div class="contrast-card" :style="{ background: '#ffffff', color: hex }">
          <div class="contrast-sample">{{ t('colory.contrast.sample') }}</div>
          <div class="contrast-meta">
            <strong class="mono">{{ ratioWhite.toFixed(2) }}</strong>
            <span class="meta-label">{{ t('colory.contrast.withWhite') }}</span>
            <span class="badges">
              <span class="badge">{{ t('colory.contrast.normal') }}: {{ wcagLevel(ratioWhite, false) }}</span>
              <span class="badge">{{ t('colory.contrast.large') }}: {{ wcagLevel(ratioWhite, true) }}</span>
            </span>
          </div>
        </div>
        <div class="contrast-card" :style="{ background: '#000000', color: hex }">
          <div class="contrast-sample">{{ t('colory.contrast.sample') }}</div>
          <div class="contrast-meta">
            <strong class="mono">{{ ratioBlack.toFixed(2) }}</strong>
            <span class="meta-label">{{ t('colory.contrast.withBlack') }}</span>
            <span class="badges">
              <span class="badge">{{ t('colory.contrast.normal') }}: {{ wcagLevel(ratioBlack, false) }}</span>
              <span class="badge">{{ t('colory.contrast.large') }}: {{ wcagLevel(ratioBlack, true) }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.colory {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.main-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.big-swatch {
  width: 12rem;
  height: 12rem;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  cursor: pointer;
  position: relative;
  flex: 0 0 auto;
}
.hidden-picker {
  opacity: 0;
  position: absolute;
  inset: 0;
  cursor: pointer;
}
.formats {
  flex: 1 1 280px;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.format-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.format-label {
  font-weight: 600;
  font-size: 0.85rem;
  min-width: 2.5rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.field.grow {
  flex: 1;
}
.field input,
.rgb-row input,
.num {
  padding: 0.4rem 0.55rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.num {
  width: 4.5rem;
}
.rgb-row {
  display: inline-flex;
  gap: 0.3rem;
  flex: 1;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
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
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.title {
  font-weight: 600;
  font-size: 0.95rem;
}
.palette {
  display: grid;
  grid-template-columns: repeat(11, minmax(0, 1fr));
  gap: 0.25rem;
}
@media (max-width: 720px) {
  .palette {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}
.swatch {
  aspect-ratio: 1;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}
.swatch:hover .swatch-label {
  opacity: 1;
}
.swatch-label {
  position: absolute;
  bottom: 0.25rem;
  left: 0.25rem;
  right: 0.25rem;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  font-size: 0.7rem;
  padding: 0.1rem 0.25rem;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 0.1s;
  text-align: center;
}
.contrast-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
@media (max-width: 600px) {
  .contrast-grid {
    grid-template-columns: 1fr;
  }
}
.contrast-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.contrast-sample {
  font-size: 1.4rem;
  font-weight: 600;
  text-align: center;
  padding: 0.5rem 0;
}
.contrast-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  background: rgba(255, 255, 255, 0.85);
  color: var(--ink);
  padding: 0.45rem 0.6rem;
  border-radius: 6px;
}
.meta-label {
  font-size: 0.78rem;
  color: var(--muted);
}
.badges {
  display: inline-flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.badge {
  font-size: 0.72rem;
  padding: 0.1rem 0.4rem;
  background: var(--border);
  border-radius: 999px;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
