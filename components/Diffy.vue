<script setup lang="ts">
import type { DiffMode } from '~/composables/useDiffy'
import { DIFF_MODES } from '~/composables/useDiffy'

const { t } = useI18n()
const { compute, stats } = useDiffy()

const textA = ref('')
const textB = ref('')
const mode = ref<DiffMode>('lines')
const ignoreCase = ref(false)
const ignoreWhitespace = ref(false)

const changes = computed(() =>
  compute(textA.value, textB.value, mode.value, {
    ignoreCase: ignoreCase.value,
    ignoreWhitespace: ignoreWhitespace.value,
  }),
)

const diffStats = computed(() => stats(changes.value))

const totalChanges = computed(
  () => diffStats.value.added + diffStats.value.removed,
)

const swap = () => {
  const tmp = textA.value
  textA.value = textB.value
  textB.value = tmp
}

const clear = () => {
  textA.value = ''
  textB.value = ''
}

const loadExample = () => {
  textA.value = [
    'const greet = (name) => {',
    '  console.log("Hello, " + name)',
    '}',
    '',
    'greet("Maria")',
  ].join('\n')
  textB.value = [
    'const greet = (name, greeting = "Hello") => {',
    '  console.log(`${greeting}, ${name}!`)',
    '}',
    '',
    'greet("Maria", "Hola")',
  ].join('\n')
}

const unitsLabel = (mode: DiffMode): string => {
  if (mode === 'lines') return t('diffy.units.lines')
  if (mode === 'words') return t('diffy.units.words')
  return t('diffy.units.chars')
}
</script>

<template>
  <div class="diffy">
    <div class="card options">
      <div class="row">
        <label class="field grow">
          <span>{{ t('diffy.mode.label') }}</span>
          <select v-model="mode">
            <option v-for="m in DIFF_MODES" :key="m" :value="m">
              {{ t(`diffy.mode.${m}`) }}
            </option>
          </select>
        </label>
        <div class="checks">
          <label class="chk">
            <input v-model="ignoreCase" type="checkbox" :disabled="mode === 'lines'" />
            <span>{{ t('diffy.options.ignoreCase') }}</span>
          </label>
          <label class="chk">
            <input v-model="ignoreWhitespace" type="checkbox" :disabled="mode === 'chars'" />
            <span>{{ t('diffy.options.ignoreWhitespace') }}</span>
          </label>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-ghost btn-sm" type="button" @click="loadExample">
          {{ t('diffy.actions.example') }}
        </button>
        <button class="btn btn-ghost btn-sm" type="button" @click="swap">
          ↕ {{ t('diffy.actions.swap') }}
        </button>
        <button
          class="btn btn-ghost btn-sm"
          type="button"
          :disabled="textA.length === 0 && textB.length === 0"
          @click="clear"
        >
          {{ t('diffy.actions.clear') }}
        </button>
      </div>
    </div>

    <div class="panes">
      <div class="pane card">
        <header class="pane-head">
          <span class="pane-title">{{ t('diffy.original') }}</span>
        </header>
        <textarea
          v-model="textA"
          class="editor mono"
          spellcheck="false"
          :placeholder="t('diffy.originalPlaceholder')"
        />
      </div>
      <div class="pane card">
        <header class="pane-head">
          <span class="pane-title">{{ t('diffy.changed') }}</span>
        </header>
        <textarea
          v-model="textB"
          class="editor mono"
          spellcheck="false"
          :placeholder="t('diffy.changedPlaceholder')"
        />
      </div>
    </div>

    <div class="card">
      <header class="head">
        <span class="title">{{ t('diffy.result') }}</span>
        <span class="stats">
          <span class="badge added">+{{ diffStats.added }}</span>
          <span class="badge removed">−{{ diffStats.removed }}</span>
          <span class="muted">· {{ unitsLabel(mode) }}</span>
        </span>
      </header>
      <p v-if="totalChanges === 0 && (textA.length > 0 || textB.length > 0)" class="empty">
        {{ t('diffy.noChanges') }}
      </p>
      <p v-else-if="textA.length === 0 && textB.length === 0" class="empty">
        {{ t('diffy.empty') }}
      </p>
      <pre v-else class="diff mono"><template v-for="(change, i) in changes" :key="i"
        ><span v-if="change.added" class="chunk-added">{{ change.value }}</span><span v-else-if="change.removed" class="chunk-removed">{{ change.value }}</span><span v-else class="chunk-same">{{ change.value }}</span></template></pre>
    </div>
  </div>
</template>

<style scoped>
.diffy {
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
.options .row {
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
  flex: 1 1 180px;
}
.field select {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
}
.checks {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  align-items: center;
}
.chk {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}
.actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.panes {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
@media (min-width: 800px) {
  .panes {
    grid-template-columns: 1fr 1fr;
  }
}
.pane {
  gap: 0.6rem;
}
.pane-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.pane-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.editor {
  width: 100%;
  min-height: 12rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font-size: 0.85rem;
  resize: vertical;
  white-space: pre;
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.title {
  font-weight: 600;
  font-size: 0.95rem;
}
.stats {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.85rem;
}
.badge {
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8rem;
  font-weight: 600;
}
.badge.added {
  background: #d4edcb;
  color: #2b5c1c;
}
.badge.removed {
  background: #f4cbc1;
  color: #8a2914;
}
.muted {
  color: var(--muted);
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.empty {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}
.diff {
  margin: 0;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.7rem 0.85rem;
  font-size: 0.85rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 28rem;
  overflow: auto;
}
.chunk-added {
  background: #d4edcb;
  color: #2b5c1c;
}
.chunk-removed {
  background: #f4cbc1;
  color: #8a2914;
  text-decoration: line-through;
}
.chunk-same {
  color: var(--ink, inherit);
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
