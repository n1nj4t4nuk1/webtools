<script setup lang="ts">
/**
 * IdGenerator.vue (Idkun)
 *
 * Format picker (UUID v4 / v7 / NIL / ULID / NanoID), batch-size input and
 * optional formatting toggles (uppercase, hyphens). Generates the chosen
 * format via `useIdGenerator.generateMany` and renders the result in a
 * scrollable code block with copy / download actions.
 */
import { ALL_FORMATS, type IdFormat } from '~/composables/useIdGenerator'

const { t } = useI18n()
const { generateMany, transform } = useIdGenerator()

const format = ref<IdFormat>('uuidv4')
const count = ref(1)
const nanoidSize = ref(21)
const uppercase = ref(false)
const hyphens = ref(true)

const ids = ref<string[]>([])
const errorMessage = ref<string | null>(null)
const copiedIndex = ref<number | null>(null)
const copiedAll = ref(false)

const isUuidLike = computed(
  () => format.value === 'uuidv4' || format.value === 'uuidv7' || format.value === 'uuidNil',
)
const isNanoid = computed(() => format.value === 'nanoid')

const displayIds = computed(() =>
  ids.value.map((id) =>
    isUuidLike.value
      ? transform(id, { uppercase: uppercase.value, hyphens: hyphens.value })
      : id,
  ),
)

const onGenerate = () => {
  errorMessage.value = null
  copiedIndex.value = null
  copiedAll.value = false
  try {
    const c = Math.max(1, Math.min(count.value || 1, 200))
    ids.value = generateMany(format.value, c, { nanoidSize: nanoidSize.value })
  } catch (err) {
    errorMessage.value = (err as Error).message
  }
}

const copyOne = async (value: string, index: number) => {
  try {
    await navigator.clipboard.writeText(value)
    copiedIndex.value = index
    setTimeout(() => {
      if (copiedIndex.value === index) copiedIndex.value = null
    }, 1500)
  } catch {
    errorMessage.value = t('idkun.errors.clipboard')
  }
}

const copyAll = async () => {
  try {
    await navigator.clipboard.writeText(displayIds.value.join('\n'))
    copiedAll.value = true
    setTimeout(() => (copiedAll.value = false), 1500)
  } catch {
    errorMessage.value = t('idkun.errors.clipboard')
  }
}

onMounted(onGenerate)
watch([format, nanoidSize], onGenerate)
</script>

<template>
  <div class="idkun">
    <div class="card config">
      <div class="row">
        <label class="field grow">
          <span>{{ t('idkun.format') }}</span>
          <select v-model="format">
            <option v-for="f in ALL_FORMATS" :key="f" :value="f">
              {{ t(`idkun.formats.${f}`) }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>{{ t('idkun.count') }}</span>
          <input v-model.number="count" type="number" min="1" max="200" />
        </label>
      </div>

      <p class="hint">{{ t(`idkun.about.${format}`) }}</p>

      <div v-if="isNanoid" class="row">
        <label class="field grow">
          <span>{{ t('idkun.nanoidSize') }} ({{ nanoidSize }})</span>
          <input v-model.number="nanoidSize" type="range" min="6" max="36" />
        </label>
      </div>

      <div v-if="isUuidLike" class="checks">
        <label class="chk">
          <input v-model="hyphens" type="checkbox" />
          <span>{{ t('idkun.hyphens') }}</span>
        </label>
        <label class="chk">
          <input v-model="uppercase" type="checkbox" />
          <span>{{ t('idkun.uppercase') }}</span>
        </label>
      </div>

      <div class="actions">
        <button
          v-if="ids.length > 1"
          class="btn btn-ghost btn-sm"
          type="button"
          @click="copyAll"
        >
          {{ copiedAll ? t('idkun.actions.copied') : t('idkun.actions.copyAll') }}
        </button>
        <button class="btn" type="button" @click="onGenerate">
          {{ t('idkun.actions.generate') }}
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <ul v-if="displayIds.length > 0" class="id-list">
      <li v-for="(id, i) in displayIds" :key="i" class="id-row">
        <code class="id-text">{{ id }}</code>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          @click="copyOne(id, i)"
        >
          {{ copiedIndex === i ? t('idkun.actions.copied') : t('idkun.actions.copy') }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.idkun {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.config {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
.row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
.field.grow {
  flex: 1 1 240px;
}
.field input[type='number'] {
  width: 5.5rem;
}
.field select {
  width: 100%;
}
.checks {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}
.chk {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}
.hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.85rem;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.error {
  color: #b53a1f;
  margin: 0;
}
.id-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.id-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.id-text {
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.92rem;
  word-break: break-all;
  user-select: all;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
