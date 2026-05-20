<script setup lang="ts">
/**
 * Yieldy.vue
 *
 * Compound-interest calculator. Inputs at the top (initial capital,
 * annual rate, years, compounding frequency, recurring contribution
 * and currency) feed `useYieldy.compute` reactively. Outputs are
 * three KPI tiles (final balance, total contributed, total interest)
 * and a year-by-year table showing balance / cumulative contribution /
 * cumulative interest at the end of each year.
 */
import type { Currency, Frequency } from '~/composables/useYieldy'
import { CURRENCIES, FREQUENCIES } from '~/composables/useYieldy'

const { t, locale } = useI18n()
const { compute, formatCurrency } = useYieldy()

const principal = ref(1000)
const annualRatePct = ref(5)
const years = ref(10)
const frequency = ref<Frequency>('monthly')
const contribution = ref(100)
const currency = ref<Currency>('EUR')

const result = computed(() =>
  compute({
    principal: principal.value,
    annualRatePct: annualRatePct.value,
    years: years.value,
    frequency: frequency.value,
    contribution: contribution.value,
  }),
)

const fmt = (n: number) => formatCurrency(n, currency.value, locale.value)
</script>

<template>
  <div class="yieldy">
    <div class="card">
      <div class="row">
        <label class="field grow">
          <span>{{ t('yieldy.principal') }}</span>
          <input v-model.number="principal" type="number" min="0" step="100" />
        </label>
        <label class="field grow">
          <span>{{ t('yieldy.rate') }} (%)</span>
          <input v-model.number="annualRatePct" type="number" min="0" max="100" step="0.1" />
        </label>
        <label class="field grow">
          <span>{{ t('yieldy.years') }}</span>
          <input v-model.number="years" type="number" min="1" max="100" />
        </label>
      </div>

      <div class="row">
        <label class="field grow">
          <span>{{ t('yieldy.frequency.label') }}</span>
          <select v-model="frequency">
            <option v-for="f in FREQUENCIES" :key="f.id" :value="f.id">
              {{ t(`yieldy.frequency.${f.id}`) }}
            </option>
          </select>
        </label>
        <label class="field grow">
          <span>{{ t('yieldy.contribution') }}</span>
          <input v-model.number="contribution" type="number" min="0" step="50" />
        </label>
        <label class="field grow">
          <span>{{ t('yieldy.currency') }}</span>
          <select v-model="currency">
            <option v-for="c in CURRENCIES" :key="c" :value="c">{{ c }}</option>
          </select>
        </label>
      </div>
      <p class="hint">{{ t('yieldy.hint') }}</p>
    </div>

    <div class="kpis">
      <div class="kpi">
        <span class="kpi-label">{{ t('yieldy.results.finalBalance') }}</span>
        <span class="kpi-value">{{ fmt(result.finalBalance) }}</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">{{ t('yieldy.results.totalContributed') }}</span>
        <span class="kpi-value muted">{{ fmt(result.totalContributed) }}</span>
      </div>
      <div class="kpi">
        <span class="kpi-label">{{ t('yieldy.results.totalInterest') }}</span>
        <span class="kpi-value highlight">{{ fmt(result.totalInterest) }}</span>
      </div>
    </div>

    <div class="card table-card">
      <span class="table-title">{{ t('yieldy.table.title') }}</span>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{{ t('yieldy.table.year') }}</th>
              <th>{{ t('yieldy.table.balance') }}</th>
              <th>{{ t('yieldy.table.contributed') }}</th>
              <th>{{ t('yieldy.table.interest') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in result.rows" :key="row.year">
              <td class="mono">{{ row.year }}</td>
              <td class="mono">{{ fmt(row.balance) }}</td>
              <td class="mono muted">{{ fmt(row.contributed) }}</td>
              <td class="mono highlight">{{ fmt(row.interest) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.yieldy {
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
.field input,
.field select {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.85rem;
}
.kpi {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.kpi-label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  font-weight: 600;
}
.kpi-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1.4rem;
  font-weight: 600;
}
.kpi-value.muted {
  color: var(--muted);
}
.kpi-value.highlight {
  color: var(--accent, #c75a3a);
}
.table-card {
  gap: 0.6rem;
}
.table-title {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  font-weight: 600;
}
.table-wrap {
  overflow-x: auto;
  max-height: 28rem;
  overflow-y: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
th,
td {
  text-align: right;
  padding: 0.45rem 0.7rem;
  border-bottom: 1px solid var(--border);
}
th:first-child,
td:first-child {
  text-align: left;
}
th {
  font-weight: 600;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  background: var(--surface);
  position: sticky;
  top: 0;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.muted {
  color: var(--muted);
}
.highlight {
  color: var(--accent, #c75a3a);
}
</style>
