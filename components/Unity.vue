<script setup lang="ts">
import type { CssUnit } from '~/composables/useUnity'
import { UNITS } from '~/composables/useUnity'

const { t } = useI18n()
const { toPx, fromPx } = useUnity()

const baseFontPx = ref(16)
const sourceUnit = ref<CssUnit>('px')
const sourceValue = ref(16)
const copiedUnit = ref<CssUnit | null>(null)

const values = computed<Record<CssUnit, number>>(() => {
  const px = toPx(sourceValue.value || 0, sourceUnit.value, baseFontPx.value)
  return {
    px: fromPx(px, 'px', baseFontPx.value),
    rem: fromPx(px, 'rem', baseFontPx.value),
    em: fromPx(px, 'em', baseFontPx.value),
    pt: fromPx(px, 'pt', baseFontPx.value),
    percent: fromPx(px, 'percent', baseFontPx.value),
  }
})

const round = (n: number, decimals = 4): number => {
  const factor = Math.pow(10, decimals)
  return Math.round(n * factor) / factor
}

const displayValue = (unit: CssUnit): string => {
  if (unit === sourceUnit.value) return String(sourceValue.value)
  return String(round(values.value[unit]))
}

const onInput = (unit: CssUnit, raw: string) => {
  const num = Number(raw)
  if (Number.isNaN(num)) return
  sourceUnit.value = unit
  sourceValue.value = num
}

const copy = async (unit: CssUnit) => {
  const value = round(values.value[unit])
  const text = unit === 'percent' ? `${value}%` : `${value}${unit}`
  try {
    await navigator.clipboard.writeText(text)
    copiedUnit.value = unit
    setTimeout(() => {
      if (copiedUnit.value === unit) copiedUnit.value = null
    }, 1500)
  } catch {
    // silent
  }
}

const unitSuffix = (unit: CssUnit): string => (unit === 'percent' ? '%' : unit)
</script>

<template>
  <div class="unity">
    <div class="card">
      <label class="field base-field">
        <span>{{ t('unity.baseFont') }} (px)</span>
        <input v-model.number="baseFontPx" type="number" min="1" max="200" class="base-input" />
      </label>
      <p class="hint">{{ t('unity.baseHint') }}</p>
    </div>

    <div class="card">
      <ul class="unit-list">
        <li v-for="unit in UNITS" :key="unit" class="unit-row">
          <span class="unit-label mono">{{ unitSuffix(unit) }}</span>
          <input
            :value="displayValue(unit)"
            type="number"
            step="any"
            class="value-input mono"
            @input="onInput(unit, ($event.target as HTMLInputElement).value)"
          />
          <span class="unit-name">{{ t(`unity.units.${unit}`) }}</span>
          <button class="btn btn-ghost btn-sm" type="button" @click="copy(unit)">
            {{ copiedUnit === unit ? t('unity.actions.copied') : t('unity.actions.copy') }}
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.unity {
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
  gap: 0.6rem;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.base-field {
  max-width: 12rem;
}
.base-input,
.value-input {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.value-input {
  flex: 1;
  min-width: 0;
}
.hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}
.unit-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.unit-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.unit-label {
  width: 3rem;
  text-align: center;
  font-weight: 600;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.35rem 0;
  font-size: 0.85rem;
}
.unit-name {
  min-width: 8rem;
  color: var(--muted);
  font-size: 0.85rem;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
@media (max-width: 600px) {
  .unit-row {
    flex-wrap: wrap;
  }
  .unit-name {
    min-width: 0;
    flex: 1;
  }
}
</style>
