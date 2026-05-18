<script setup lang="ts">
/**
 * YamlJson.vue
 *
 * Two-pane editor (YAML ↔ JSON) that uses `useYamlJson.detectFormat` to
 * decide which side the user edited and converts to the other via
 * `yamlToJson` / `jsonToYaml`. Errors include the failing line / column
 * when the underlying parser provides them.
 */
const { t } = useI18n()
const { detectFormat, yamlToJson, jsonToYaml } = useYamlJson()

type Direction = 'auto' | 'yaml2json' | 'json2yaml'

const input = ref('')
const direction = ref<Direction>('auto')
const indent = ref(2)
const copied = ref(false)

const detected = computed(() => detectFormat(input.value))

const resolvedDirection = computed<'yaml2json' | 'json2yaml' | 'idle'>(() => {
  if (direction.value === 'yaml2json') return 'yaml2json'
  if (direction.value === 'json2yaml') return 'json2yaml'
  if (detected.value === 'json') return 'json2yaml'
  if (detected.value === 'yaml') return 'yaml2json'
  return 'idle'
})

const safeIndent = computed(() => Math.max(0, Math.min(10, indent.value || 0)))

const conversion = computed<{ output: string; error: string | null }>(() => {
  if (input.value.trim().length === 0) return { output: '', error: null }
  if (resolvedDirection.value === 'idle') {
    return { output: '', error: t('yamljson.errors.unknownInput') }
  }
  const result =
    resolvedDirection.value === 'yaml2json'
      ? yamlToJson(input.value, safeIndent.value)
      : jsonToYaml(input.value, safeIndent.value)
  if (result.error) {
    const errKey =
      resolvedDirection.value === 'yaml2json'
        ? 'yamljson.errors.invalidYaml'
        : 'yamljson.errors.invalidJson'
    if (result.error.line !== null) {
      return {
        output: '',
        error: `${t(errKey)} — ${t('yamljson.errors.atLine', {
          line: result.error.line,
          col: result.error.col,
        })}: ${result.error.msg}`,
      }
    }
    return { output: '', error: `${t(errKey)}: ${result.error.msg}` }
  }
  return { output: result.output, error: null }
})

const swap = () => {
  if (conversion.value.output.length === 0) return
  input.value = conversion.value.output
}

const copyOutput = async () => {
  if (conversion.value.output.length === 0) return
  try {
    await navigator.clipboard.writeText(conversion.value.output)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // silent
  }
}

const download = () => {
  if (conversion.value.output.length === 0) return
  const isJson = resolvedDirection.value === 'yaml2json'
  const ext = isJson ? 'json' : 'yaml'
  const mime = isJson ? 'application/json' : 'application/x-yaml'
  const blob = new Blob([conversion.value.output], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `yamljson.${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const loadExample = () => {
  if (resolvedDirection.value === 'json2yaml') {
    input.value = JSON.stringify(
      {
        name: 'webtools',
        version: '1.0.0',
        private: true,
        scripts: { dev: 'nuxt dev', build: 'nuxt generate' },
        keywords: ['nuxt', 'spa', 'tools'],
      },
      null,
      2,
    )
  } else {
    input.value = [
      'name: webtools',
      'version: 1.0.0',
      'private: true',
      'scripts:',
      '  dev: nuxt dev',
      '  build: nuxt generate',
      'keywords:',
      '  - nuxt',
      '  - spa',
      '  - tools',
    ].join('\n')
  }
}

const clear = () => {
  input.value = ''
}

const directionOptions: Direction[] = ['auto', 'yaml2json', 'json2yaml']

const detectedLabel = computed(() => {
  if (detected.value === 'empty') return ''
  return t(`yamljson.detected.${detected.value}`)
})
</script>

<template>
  <div class="yamljson">
    <div class="card options">
      <div class="row">
        <label class="field grow">
          <span>{{ t('yamljson.direction.label') }}</span>
          <select v-model="direction">
            <option v-for="d in directionOptions" :key="d" :value="d">
              {{ t(`yamljson.direction.${d}`) }}
            </option>
          </select>
        </label>
        <label class="field">
          <span>{{ t('yamljson.indent') }}</span>
          <input
            v-model.number="indent"
            type="number"
            min="0"
            max="10"
            class="indent-input"
          />
        </label>
        <span v-if="detectedLabel" class="detected">
          {{ t('yamljson.detected.label') }}: <strong>{{ detectedLabel }}</strong>
        </span>
      </div>
    </div>

    <div class="panes">
      <div class="pane card">
        <header class="pane-head">
          <span class="pane-title">{{ t('yamljson.input') }}</span>
          <div class="pane-actions">
            <button class="btn btn-ghost btn-sm" type="button" @click="loadExample">
              {{ t('yamljson.actions.example') }}
            </button>
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              :disabled="input.length === 0"
              @click="clear"
            >
              {{ t('yamljson.actions.clear') }}
            </button>
          </div>
        </header>
        <textarea
          v-model="input"
          class="editor"
          spellcheck="false"
          :placeholder="t('yamljson.inputPlaceholder')"
        />
      </div>

      <div class="pane card">
        <header class="pane-head">
          <span class="pane-title">{{ t('yamljson.output') }}</span>
          <div class="pane-actions">
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              :disabled="conversion.output.length === 0"
              @click="swap"
            >
              ↑ {{ t('yamljson.actions.useAsInput') }}
            </button>
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              :disabled="conversion.output.length === 0"
              @click="copyOutput"
            >
              {{ copied ? t('yamljson.actions.copied') : t('yamljson.actions.copy') }}
            </button>
            <button
              class="btn btn-sm"
              type="button"
              :disabled="conversion.output.length === 0"
              @click="download"
            >
              {{ t('yamljson.actions.download') }}
            </button>
          </div>
        </header>
        <textarea
          v-if="!conversion.error"
          class="editor"
          spellcheck="false"
          readonly
          :value="conversion.output"
          :placeholder="t('yamljson.outputPlaceholder')"
        />
        <p v-else class="error">{{ conversion.error }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.yamljson {
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
  align-items: center;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.field.grow {
  flex: 1 1 200px;
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
.detected {
  font-size: 0.82rem;
  color: var(--muted);
  margin-left: auto;
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
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.pane-title {
  font-weight: 600;
  font-size: 0.95rem;
}
.pane-actions {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.editor {
  width: 100%;
  min-height: 18rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  resize: vertical;
  white-space: pre;
}
.error {
  margin: 0;
  color: #b53a1f;
  font-size: 0.9rem;
  padding: 0.7rem 0.85rem;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-height: 18rem;
  white-space: pre-wrap;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
