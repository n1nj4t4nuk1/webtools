<script setup lang="ts">
const { t } = useI18n()
const { validate, format, minify, sortKeys, stats } = useJsonpad()

const input = ref('')
const indent = ref(2)
const copied = ref(false)

const indentValue = computed(() => Math.max(0, Math.min(10, indent.value || 0)))

const validation = computed(() => validate(input.value))

const statusClass = computed(() => {
  if (input.value.trim().length === 0) return 'idle'
  return validation.value.valid ? 'ok' : 'err'
})

const computedStats = computed(() => {
  if (!validation.value.valid) return null
  return stats(input.value, validation.value.parsed)
})

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

const doFormat = () => {
  if (!validation.value.valid) return
  input.value = format(validation.value.parsed, indentValue.value)
}

const doMinify = () => {
  if (!validation.value.valid) return
  input.value = minify(validation.value.parsed)
}

const doSortKeys = () => {
  if (!validation.value.valid) return
  input.value = format(sortKeys(validation.value.parsed), indentValue.value)
}

const copyOutput = async () => {
  if (input.value.length === 0) return
  try {
    await navigator.clipboard.writeText(input.value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // silent
  }
}

const download = () => {
  if (input.value.length === 0) return
  const blob = new Blob([input.value], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'data.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const loadExample = () => {
  input.value = JSON.stringify(
    {
      users: [
        { id: 1, name: 'María', email: 'maria@example.com', active: true },
        { id: 2, name: 'Juan', email: 'juan@example.com', active: false },
      ],
      meta: { total: 2, page: 1 },
    },
    null,
    2,
  )
}

const clear = () => {
  input.value = ''
}

</script>

<template>
  <div class="jsonpad">
    <div class="card toolbar">
      <div class="left">
        <label class="field">
          <span>{{ t('jsonpad.indent') }}</span>
          <input
            v-model.number="indent"
            type="number"
            min="0"
            max="10"
            class="indent-input"
          />
        </label>
      </div>
      <div class="right">
        <button
          class="btn"
          type="button"
          :disabled="!validation.valid"
          @click="doFormat"
        >
          {{ t('jsonpad.actions.format') }}
        </button>
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="!validation.valid"
          @click="doMinify"
        >
          {{ t('jsonpad.actions.minify') }}
        </button>
        <button
          class="btn btn-ghost"
          type="button"
          :disabled="!validation.valid"
          @click="doSortKeys"
        >
          {{ t('jsonpad.actions.sortKeys') }}
        </button>
      </div>
    </div>

    <div class="status" :class="statusClass">
      <template v-if="input.trim().length === 0">
        <span class="status-dot dot-idle"></span>
        <span>{{ t('jsonpad.status.empty') }}</span>
      </template>
      <template v-else-if="validation.valid">
        <span class="status-dot dot-ok"></span>
        <span>{{ t('jsonpad.status.valid') }}</span>
        <span v-if="computedStats" class="stats">
          · {{ formatBytes(computedStats.bytes) }}
          · {{ t('jsonpad.stats.keys', { n: computedStats.keys }) }}
          · {{ t('jsonpad.stats.depth', { n: computedStats.depth }) }}
          · {{ t('jsonpad.stats.objects', { n: computedStats.objects }) }}
          · {{ t('jsonpad.stats.arrays', { n: computedStats.arrays }) }}
        </span>
      </template>
      <template v-else-if="validation.error">
        <span class="status-dot dot-err"></span>
        <span>
          <template v-if="validation.error.line !== null">
            {{ t('jsonpad.status.errorAt', {
              line: validation.error.line,
              col: validation.error.col,
            }) }}
          </template>
          <template v-else>
            {{ t('jsonpad.status.error') }}
          </template>
          — <code>{{ validation.error.msg }}</code>
        </span>
      </template>
    </div>

    <div class="card editor-card">
      <header class="editor-head">
        <span class="title">{{ t('jsonpad.editor') }}</span>
        <div class="head-actions">
          <button class="btn btn-ghost btn-sm" type="button" @click="loadExample">
            {{ t('jsonpad.actions.example') }}
          </button>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="input.length === 0"
            @click="clear"
          >
            {{ t('jsonpad.actions.clear') }}
          </button>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="input.length === 0"
            @click="copyOutput"
          >
            {{ copied ? t('jsonpad.actions.copied') : t('jsonpad.actions.copy') }}
          </button>
          <button
            class="btn btn-sm"
            type="button"
            :disabled="!validation.valid"
            @click="download"
          >
            {{ t('jsonpad.actions.download') }}
          </button>
        </div>
      </header>
      <textarea
        v-model="input"
        class="editor"
        spellcheck="false"
        :placeholder="t('jsonpad.placeholder')"
      />
    </div>
  </div>
</template>

<style scoped>
.jsonpad {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1rem;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  flex-wrap: wrap;
}
.toolbar .left,
.toolbar .right {
  display: inline-flex;
  align-items: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field select,
.field input {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
}
.indent-input {
  width: 5rem;
}
.editor-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.editor-head {
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
.head-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.editor {
  width: 100%;
  min-height: 24rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.88rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  resize: vertical;
  white-space: pre;
  tab-size: 2;
}
.status {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.85rem;
  border-radius: var(--radius);
  font-size: 0.85rem;
  border: 1px solid var(--border);
}
.status.ok {
  background: #f0f7ee;
  border-color: #cfe3c7;
  color: #2b5c1c;
}
.status.err {
  background: #fdf1ee;
  border-color: #f0c6bc;
  color: #8a2914;
}
.status.idle {
  background: var(--surface);
  color: var(--muted);
}
.status code {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.82rem;
}
.status-dot {
  display: inline-block;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-ok {
  background: #4a9d2f;
}
.dot-err {
  background: #c84a2e;
}
.dot-idle {
  background: #aaa;
}
.stats {
  color: inherit;
  opacity: 0.85;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
