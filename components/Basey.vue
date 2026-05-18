<script setup lang="ts">
/**
 * Basey.vue
 *
 * Row of editable inputs — one per active numeric base — backed by a shared
 * BigInt source-of-truth. Editing any input re-runs `useBasey.convertAll`
 * from that base; if the value is invalid only that row shows an error and
 * the others keep their previous content. Allows adding custom bases on the
 * fly via the `+` action.
 */
import type { BaseSpec } from '~/composables/useBasey'
import { DEFAULT_BASES } from '~/composables/useBasey'

const { t } = useI18n()
const { convertAll, isValid } = useBasey()

const bases = ref<BaseSpec[]>(DEFAULT_BASES.map((b) => ({ ...b })))
const sourceId = ref<string>('dec')
const sourceValue = ref('42')
const copiedId = ref<string | null>(null)

const newRadix = ref<number | null>(null)
const addError = ref<string | null>(null)

const sourceBase = computed(() => bases.value.find((b) => b.id === sourceId.value))

const radixesInOrder = computed(() => bases.value.map((b) => b.radix))

const conversion = computed(() => {
  const fromRadix = sourceBase.value?.radix ?? 10
  return convertAll(sourceValue.value, fromRadix, radixesInOrder.value)
})

const valueFor = (base: BaseSpec, index: number): string => {
  if (base.id === sourceId.value) return sourceValue.value
  return conversion.value.values[index]
}

const onInput = (base: BaseSpec, raw: string) => {
  sourceId.value = base.id
  sourceValue.value = raw
}

const labelFor = (base: BaseSpec): string => {
  if (base.builtin) return t(`basey.bases.${base.id}`)
  return t('basey.customLabel', { radix: base.radix })
}

const placeholderFor = (base: BaseSpec): string => {
  if (base.builtin) return t(`basey.placeholders.${base.id}`)
  return ''
}

const addCustomBase = () => {
  addError.value = null
  const r = Number(newRadix.value)
  if (!Number.isFinite(r) || !Number.isInteger(r) || r < 2 || r > 36) {
    addError.value = t('basey.errors.invalidRadix')
    return
  }
  const id = `custom-${r}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  bases.value.push({ id, radix: r, builtin: false })
  newRadix.value = null
}

const removeBase = (base: BaseSpec) => {
  if (base.builtin) return
  bases.value = bases.value.filter((b) => b.id !== base.id)
  if (sourceId.value === base.id) sourceId.value = 'dec'
}

const copy = async (base: BaseSpec, index: number) => {
  const value = valueFor(base, index)
  if (value.length === 0) return
  try {
    await navigator.clipboard.writeText(value)
    copiedId.value = base.id
    setTimeout(() => {
      if (copiedId.value === base.id) copiedId.value = null
    }, 1500)
  } catch {
    // silent
  }
}

const clear = () => {
  sourceValue.value = ''
}

const sourceInvalid = computed(
  () =>
    sourceValue.value.length > 0 &&
    sourceBase.value !== undefined &&
    !isValid(sourceValue.value, sourceBase.value.radix),
)
</script>

<template>
  <div class="basey">
    <div class="card">
      <header class="head">
        <span class="title">{{ t('basey.title') }}</span>
        <button class="btn btn-ghost btn-sm" type="button" @click="clear">
          {{ t('basey.actions.clear') }}
        </button>
      </header>
      <ul class="base-list">
        <li v-for="(base, i) in bases" :key="base.id" class="base-row">
          <span class="base-label mono">{{ labelFor(base) }}</span>
          <input
            :value="valueFor(base, i)"
            type="text"
            spellcheck="false"
            class="value-input mono"
            :class="{ 'is-err': sourceInvalid && sourceId === base.id }"
            :placeholder="placeholderFor(base)"
            @input="onInput(base, ($event.target as HTMLInputElement).value)"
          />
          <div class="row-actions">
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              :disabled="valueFor(base, i).length === 0"
              @click="copy(base, i)"
            >
              {{ copiedId === base.id ? t('basey.actions.copied') : t('basey.actions.copy') }}
            </button>
            <button
              v-if="!base.builtin"
              type="button"
              class="btn-icon"
              :title="t('basey.actions.removeBase')"
              @click="removeBase(base)"
            >×</button>
          </div>
        </li>
      </ul>
      <p v-if="sourceInvalid" class="error">
        {{ t('basey.errors.invalid', { base: labelFor(sourceBase!) }) }}
      </p>
    </div>

    <div class="card add-card">
      <header class="head">
        <span class="title">{{ t('basey.addCustom.title') }}</span>
      </header>
      <div class="add-row">
        <label class="field grow">
          <span>{{ t('basey.addCustom.label') }}</span>
          <input
            v-model.number="newRadix"
            type="number"
            min="2"
            max="36"
            class="radix-input"
            :placeholder="t('basey.addCustom.placeholder')"
            @keyup.enter="addCustomBase"
          />
        </label>
        <button class="btn" type="button" @click="addCustomBase">
          + {{ t('basey.actions.addBase') }}
        </button>
      </div>
      <p class="hint">{{ t('basey.addCustom.hint') }}</p>
      <p v-if="addError" class="error">{{ addError }}</p>
    </div>
  </div>
</template>

<style scoped>
.basey {
  display: flex;
  flex-direction: column;
  gap: 1rem;
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
.base-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.base-row {
  display: grid;
  grid-template-columns: 8rem 1fr auto;
  gap: 0.5rem;
  align-items: center;
}
@media (max-width: 640px) {
  .base-row {
    grid-template-columns: 1fr;
  }
}
.base-label {
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.35rem 0.65rem;
  font-weight: 600;
  font-size: 0.85rem;
  text-align: center;
}
.value-input {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.value-input.is-err {
  border-color: #c84a2e;
  background: #fdf1ee;
}
.row-actions {
  display: inline-flex;
  gap: 0.3rem;
}
.btn-icon {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  width: 1.8rem;
  height: 1.8rem;
  cursor: pointer;
}
.add-row {
  display: flex;
  align-items: flex-end;
  gap: 0.6rem;
  flex-wrap: wrap;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field.grow {
  flex: 1 1 160px;
}
.radix-input {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
  width: 100%;
}
.hint {
  margin: 0;
  color: var(--muted);
  font-size: 0.82rem;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.error {
  margin: 0;
  color: #b53a1f;
  font-size: 0.85rem;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
