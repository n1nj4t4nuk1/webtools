<script setup lang="ts">
import type { Shadow } from '~/composables/useShadowy'

const { t } = useI18n()
const { buildCss } = useShadowy()

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const shadows = ref<Shadow[]>([
  {
    id: makeId(),
    x: 0,
    y: 4,
    blur: 12,
    spread: 0,
    color: '#000000',
    alpha: 0.15,
    inset: false,
  },
])
const copied = ref(false)

const MAX_SHADOWS = 4

const cssValue = computed(() => buildCss(shadows.value))
const cssDeclaration = computed(() => `box-shadow: ${cssValue.value};`)

const canAdd = computed(() => shadows.value.length < MAX_SHADOWS)
const canRemove = computed(() => shadows.value.length > 1)

const addShadow = () => {
  if (!canAdd.value) return
  shadows.value.push({
    id: makeId(),
    x: 0,
    y: 2,
    blur: 8,
    spread: 0,
    color: '#000000',
    alpha: 0.1,
    inset: false,
  })
}

const removeShadow = (id: string) => {
  if (!canRemove.value) return
  shadows.value = shadows.value.filter((s) => s.id !== id)
}

const copyCss = async () => {
  try {
    await navigator.clipboard.writeText(cssDeclaration.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // silent
  }
}
</script>

<template>
  <div class="shadowy">
    <div class="preview-stage">
      <div class="preview-box" :style="{ boxShadow: cssValue }" />
    </div>

    <div class="card shadows">
      <header class="head">
        <span class="title">{{ t('shadowy.title') }}</span>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="!canAdd"
          @click="addShadow"
        >
          + {{ t('shadowy.actions.add') }}
        </button>
      </header>

      <div v-for="(shadow, i) in shadows" :key="shadow.id" class="shadow-card">
        <header class="shadow-head">
          <span class="shadow-label">{{ t('shadowy.layer', { n: i + 1 }) }}</span>
          <button
            type="button"
            class="btn-icon"
            :disabled="!canRemove"
            :title="t('shadowy.actions.remove')"
            @click="removeShadow(shadow.id)"
          >×</button>
        </header>

        <div class="grid">
          <label class="field">
            <span>{{ t('shadowy.offsetX') }} ({{ shadow.x }}px)</span>
            <input v-model.number="shadow.x" type="range" min="-50" max="50" />
          </label>
          <label class="field">
            <span>{{ t('shadowy.offsetY') }} ({{ shadow.y }}px)</span>
            <input v-model.number="shadow.y" type="range" min="-50" max="50" />
          </label>
          <label class="field">
            <span>{{ t('shadowy.blur') }} ({{ shadow.blur }}px)</span>
            <input v-model.number="shadow.blur" type="range" min="0" max="100" />
          </label>
          <label class="field">
            <span>{{ t('shadowy.spread') }} ({{ shadow.spread }}px)</span>
            <input v-model.number="shadow.spread" type="range" min="-30" max="30" />
          </label>
          <label class="field color-field">
            <span>{{ t('shadowy.color') }}</span>
            <div class="color-row">
              <input v-model="shadow.color" type="color" class="color-input" />
              <input v-model="shadow.color" type="text" class="hex-input mono" maxlength="7" />
            </div>
          </label>
          <label class="field">
            <span>{{ t('shadowy.alpha') }} ({{ shadow.alpha.toFixed(2) }})</span>
            <input
              v-model.number="shadow.alpha"
              type="range"
              min="0"
              max="1"
              step="0.01"
            />
          </label>
          <label class="chk">
            <input v-model="shadow.inset" type="checkbox" />
            <span>{{ t('shadowy.inset') }}</span>
          </label>
        </div>
      </div>
    </div>

    <div class="card output-card">
      <header class="head">
        <span class="title">{{ t('shadowy.css') }}</span>
        <button class="btn btn-ghost btn-sm" type="button" @click="copyCss">
          {{ copied ? t('shadowy.actions.copied') : t('shadowy.actions.copy') }}
        </button>
      </header>
      <code class="css-output">{{ cssDeclaration }}</code>
    </div>
  </div>
</template>

<style scoped>
.shadowy {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.preview-stage {
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 3rem 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 14rem;
}
.preview-box {
  width: 8rem;
  height: 8rem;
  background: var(--surface);
  border-radius: var(--radius);
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
  gap: 0.5rem;
}
.title {
  font-weight: 600;
  font-size: 0.95rem;
}
.shadow-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.85rem;
  background: var(--bg, #fff);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.shadow-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.shadow-label {
  font-size: 0.82rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.6rem 1rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field input[type='range'] {
  width: 100%;
}
.color-field .color-row {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.color-input {
  width: 2.4rem;
  height: 2rem;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
}
.hex-input {
  flex: 1;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg, #fff);
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.chk {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
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
.css-output {
  display: block;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.7rem 0.85rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-all;
  user-select: all;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
