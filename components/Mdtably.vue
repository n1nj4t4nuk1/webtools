<script setup lang="ts">
/**
 * Mdtably.vue
 *
 * Two-pane editor: a CSV textarea on top (with delimiter selector,
 * has-header toggle and per-column alignment chips) and a read-only
 * Markdown preview below with a copy button. Edits re-run
 * `useMdtably.parse` on each keystroke to refresh the alignment
 * controls (one chip per detected column) and call `buildMarkdown` to
 * produce the pretty-printed output.
 */
import type { Alignment } from '~/composables/useMdtably'
import { ALIGNMENTS } from '~/composables/useMdtably'

const { t } = useI18n()
const { parse, buildMarkdown, detectDelimiter } = useMdtably()

type DelimiterChoice = 'auto' | ',' | ';' | '\t' | '|'

const csvInput = ref('')
const delimiterChoice = ref<DelimiterChoice>('auto')
const hasHeader = ref(true)
const alignments = ref<Alignment[]>([])
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

const effectiveDelimiter = computed(() => {
  if (delimiterChoice.value === 'auto') return detectDelimiter(csvInput.value)
  return delimiterChoice.value
})

const detectedDelimiterLabel = computed(() => {
  const d = effectiveDelimiter.value
  if (d === '\t') return 'Tab'
  return d
})

const rows = computed(() => parse(csvInput.value, effectiveDelimiter.value))

const columnCount = computed(() =>
  rows.value.length === 0 ? 0 : Math.max(...rows.value.map((r) => r.length)),
)

watch(columnCount, (count) => {
  if (count === alignments.value.length) return
  const next: Alignment[] = []
  for (let i = 0; i < count; i++) {
    next.push(alignments.value[i] ?? 'none')
  }
  alignments.value = next
})

const markdown = computed(() => {
  if (rows.value.length === 0) return ''
  return buildMarkdown(rows.value, {
    hasHeader: hasHeader.value,
    alignments: alignments.value,
  })
})

const headerPreview = computed(() => {
  if (rows.value.length === 0) return []
  const colCount = columnCount.value
  if (hasHeader.value && rows.value[0]) {
    const first = rows.value[0]
    const out: string[] = []
    for (let i = 0; i < colCount; i++) out.push(first[i] ?? '')
    return out
  }
  return Array.from({ length: colCount }, (_, i) => `Column ${i + 1}`)
})

const setAlignment = (index: number, value: Alignment) => {
  const next = [...alignments.value]
  next[index] = value
  alignments.value = next
}

const copy = async () => {
  if (!markdown.value) return
  try {
    await navigator.clipboard.writeText(markdown.value)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    /* ignore */
  }
}

const examples: { key: string; csv: string }[] = [
  {
    key: 'simple',
    csv: 'name,age,city\nAlice,30,Madrid\nBob,25,Tokyo\nCharlie,42,New York',
  },
  {
    key: 'stats',
    csv: 'metric,jan,feb,mar\nrevenue,1200,1450,1600\nusers,340,420,510\nchurn,1.2,0.9,1.1',
  },
  {
    key: 'users',
    csv: 'id;email;role;active\n1;alice@example.com;admin;yes\n2;bob@example.com;editor;yes\n3;charlie@example.com;viewer;no',
  },
]

const useExample = (csv: string) => {
  csvInput.value = csv
}

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})
</script>

<template>
  <div class="mdtably">
    <div class="card">
      <label class="field">
        <span>{{ t('mdtably.input.label') }}</span>
        <textarea
          v-model="csvInput"
          class="mono input-area"
          rows="8"
          spellcheck="false"
          autocomplete="off"
          :placeholder="t('mdtably.input.placeholder')"
        />
      </label>

      <div class="examples">
        <span class="examples-label">{{ t('mdtably.examples.label') }}</span>
        <button
          v-for="ex in examples"
          :key="ex.key"
          type="button"
          class="example-chip"
          @click="useExample(ex.csv)"
        >
          {{ t(`mdtably.examples.${ex.key}`) }}
        </button>
      </div>
    </div>

    <div class="card">
      <div class="row">
        <label class="field grow">
          <span>{{ t('mdtably.delimiter.label') }}</span>
          <select v-model="delimiterChoice">
            <option value="auto">
              {{ t('mdtably.delimiter.auto', { char: detectedDelimiterLabel }) }}
            </option>
            <option value=",">{{ t('mdtably.delimiter.comma') }}</option>
            <option value=";">{{ t('mdtably.delimiter.semicolon') }}</option>
            <option value="	">{{ t('mdtably.delimiter.tab') }}</option>
            <option value="|">{{ t('mdtably.delimiter.pipe') }}</option>
          </select>
        </label>

        <label class="toggle">
          <input v-model="hasHeader" type="checkbox" />
          <span>{{ t('mdtably.hasHeader') }}</span>
        </label>
      </div>

      <div v-if="columnCount > 0" class="columns">
        <span class="columns-title">{{ t('mdtably.columns.title') }}</span>
        <div class="columns-grid">
          <div v-for="(_, i) in alignments" :key="i" class="column-ctl">
            <span class="column-label" :title="headerPreview[i]">
              {{ headerPreview[i] || t('mdtably.columns.column', { n: i + 1 }) }}
            </span>
            <div class="align-chips">
              <button
                v-for="a in ALIGNMENTS"
                :key="a"
                type="button"
                class="chip"
                :class="{ active: (alignments[i] ?? 'none') === a }"
                @click="setAlignment(i, a)"
              >
                {{ t(`mdtably.alignment.${a}`) }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <header class="output-header">
        <span class="output-label">{{ t('mdtably.output.label') }}</span>
        <button
          type="button"
          class="btn btn-sm"
          :disabled="!markdown"
          @click="copy"
        >
          {{ copied ? t('mdtably.output.copied') : t('mdtably.output.copy') }}
        </button>
      </header>
      <pre v-if="markdown" class="mono output">{{ markdown }}</pre>
      <p v-else class="empty">{{ t('mdtably.output.empty') }}</p>
    </div>
  </div>
</template>

<style scoped>
.mdtably {
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
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field.grow {
  flex: 1 1 220px;
}
.input-area {
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 8rem;
}
.field select {
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.examples {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}
.examples-label {
  font-size: 0.78rem;
  color: var(--muted);
}
.example-chip {
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.12s;
}
.example-chip:hover {
  background: var(--surface);
}
.row {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
.toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  padding-bottom: 0.55rem;
}
.columns {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.columns-title {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}
.columns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.6rem;
}
.column-ctl {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.55rem 0.7rem;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.column-label {
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.align-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.chip {
  padding: 0.22rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font-size: 0.78rem;
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
}
.chip:hover {
  background: var(--surface);
}
.chip.active {
  background: var(--accent, #c75a3a);
  color: #fff;
  border-color: var(--accent, #c75a3a);
}
.output-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
}
.output-label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  font-weight: 600;
}
.output {
  margin: 0;
  padding: 0.85rem;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow-x: auto;
  white-space: pre;
  font-size: 0.88rem;
  line-height: 1.45;
}
.empty {
  margin: 0;
  color: var(--muted);
  font-size: 0.9rem;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
