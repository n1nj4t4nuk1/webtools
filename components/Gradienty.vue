<script setup lang="ts">
/**
 * Gradienty.vue
 *
 * Visual builder for CSS gradients. Hosts a list of color stops (each with
 * color, position and a remove button), gradient-type controls (linear /
 * radial / conic plus angle, shape, position) and a live preview pane.
 * The output CSS string comes from `useGradienty.buildCss` and is exposed
 * through a copy-to-clipboard button.
 */
import type {
  ColorStop,
  GradientPosition,
  GradientType,
  RadialShape,
} from '~/composables/useGradienty'
import { POSITIONS } from '~/composables/useGradienty'

const { t } = useI18n()
const { buildCss } = useGradienty()

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const type = ref<GradientType>('linear')
const angle = ref(90)
const shape = ref<RadialShape>('circle')
const position = ref<GradientPosition>('center')
const stops = ref<ColorStop[]>([
  { id: makeId(), color: '#c75a3a', position: 0 },
  { id: makeId(), color: '#1f1b16', position: 100 },
])
const copied = ref(false)

const MAX_STOPS = 6

const cssValue = computed(() =>
  buildCss({
    type: type.value,
    angle: angle.value,
    shape: shape.value,
    position: position.value,
    stops: stops.value,
  }),
)

const cssDeclaration = computed(() => `background: ${cssValue.value};`)

const canAdd = computed(() => stops.value.length < MAX_STOPS)
const canRemove = computed(() => stops.value.length > 2)

const addStop = () => {
  if (!canAdd.value) return
  const last = stops.value[stops.value.length - 1]
  const newPos = Math.min(100, Math.round(last.position - 10))
  stops.value.push({ id: makeId(), color: '#ffffff', position: Math.max(0, newPos) })
}

const removeStop = (id: string) => {
  if (!canRemove.value) return
  stops.value = stops.value.filter((s) => s.id !== id)
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

const typeOptions: GradientType[] = ['linear', 'radial', 'conic']
const shapeOptions: RadialShape[] = ['circle', 'ellipse']
</script>

<template>
  <div class="gradienty">
    <div class="preview" :style="{ background: cssValue }" />

    <div class="card">
      <div class="row">
        <label class="field grow">
          <span>{{ t('gradienty.type.label') }}</span>
          <select v-model="type">
            <option v-for="o in typeOptions" :key="o" :value="o">
              {{ t(`gradienty.type.${o}`) }}
            </option>
          </select>
        </label>
        <label v-if="type === 'linear' || type === 'conic'" class="field">
          <span>{{ t('gradienty.angle') }} ({{ angle }}°)</span>
          <input v-model.number="angle" type="range" min="0" max="360" />
        </label>
        <label v-if="type === 'radial'" class="field">
          <span>{{ t('gradienty.shape.label') }}</span>
          <select v-model="shape">
            <option v-for="o in shapeOptions" :key="o" :value="o">
              {{ t(`gradienty.shape.${o}`) }}
            </option>
          </select>
        </label>
        <label v-if="type === 'radial' || type === 'conic'" class="field">
          <span>{{ t('gradienty.position.label') }}</span>
          <select v-model="position">
            <option v-for="p in POSITIONS" :key="p" :value="p">{{ p }}</option>
          </select>
        </label>
      </div>
    </div>

    <div class="card">
      <header class="head">
        <span class="title">{{ t('gradienty.stops.title') }}</span>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :disabled="!canAdd"
          @click="addStop"
        >
          + {{ t('gradienty.stops.add') }}
        </button>
      </header>
      <ul class="stop-list">
        <li v-for="stop in stops" :key="stop.id" class="stop-row">
          <input v-model="stop.color" type="color" class="color-input" />
          <input v-model="stop.color" type="text" class="hex-input mono" maxlength="7" />
          <input
            v-model.number="stop.position"
            type="range"
            min="0"
            max="100"
            class="pos-range"
          />
          <span class="pos-value mono">{{ stop.position }}%</span>
          <button
            type="button"
            class="btn-icon"
            :disabled="!canRemove"
            @click="removeStop(stop.id)"
          >×</button>
        </li>
      </ul>
    </div>

    <div class="card output-card">
      <header class="head">
        <span class="title">{{ t('gradienty.css') }}</span>
        <button class="btn btn-ghost btn-sm" type="button" @click="copyCss">
          {{ copied ? t('gradienty.actions.copied') : t('gradienty.actions.copy') }}
        </button>
      </header>
      <code class="css-output">{{ cssDeclaration }}</code>
    </div>
  </div>
</template>

<style scoped>
.gradienty {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.preview {
  width: 100%;
  height: 14rem;
  border: 1px solid var(--border);
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
  flex: 1 1 160px;
}
.field select,
.field input[type='range'] {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
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
.stop-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.stop-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  width: 5.5rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg, #fff);
}
.pos-range {
  flex: 1;
}
.pos-value {
  width: 3rem;
  text-align: right;
  font-size: 0.85rem;
  color: var(--muted);
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
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
