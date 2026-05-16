<script setup lang="ts">
const { t } = useI18n()
const { buildRegex, findMatches, buildHighlight, applyReplace } = useRegexpad()

const pattern = ref('')
const replacement = ref('')
const source = ref('')
const flagG = ref(true)
const flagI = ref(false)
const flagM = ref(false)
const flagS = ref(false)
const flagU = ref(false)
const copied = ref(false)

const flags = computed(() => {
  let f = ''
  if (flagG.value) f += 'g'
  if (flagI.value) f += 'i'
  if (flagM.value) f += 'm'
  if (flagS.value) f += 's'
  if (flagU.value) f += 'u'
  return f
})

const regexResult = computed(() => buildRegex(pattern.value, flags.value))

const matches = computed(() => {
  if (!regexResult.value.regex || source.value.length === 0) return []
  return findMatches(source.value, regexResult.value.regex)
})

const highlight = computed(() => buildHighlight(source.value, matches.value))

const replaceResult = computed(() => {
  if (!regexResult.value.regex) return { output: source.value, error: null }
  return applyReplace(source.value, regexResult.value.regex, replacement.value)
})

const copyOutput = async () => {
  if (replaceResult.value.output.length === 0) return
  try {
    await navigator.clipboard.writeText(replaceResult.value.output)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // silent
  }
}

const download = () => {
  if (replaceResult.value.output.length === 0) return
  const blob = new Blob([replaceResult.value.output], {
    type: 'text/plain;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'regexpad.txt'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const loadExample = () => {
  pattern.value = '\\b([\\w.+-]+)@([\\w-]+\\.[\\w.-]+)\\b'
  replacement.value = '<a href="mailto:$1@$2">$1@$2</a>'
  source.value = [
    'Contacta con maria@example.com o juan.perez@empresa.es.',
    'Para soporte: support@webtools.dev (responde en 24h).',
    'Otros: hola+spam@gmail.com, info@no-reply.org',
  ].join('\n')
  flagG.value = true
  flagI.value = true
  flagM.value = false
  flagS.value = false
  flagU.value = false
}

const clear = () => {
  pattern.value = ''
  replacement.value = ''
  source.value = ''
}

const flagDefs: { key: 'g' | 'i' | 'm' | 's' | 'u'; ref: typeof flagG }[] = [
  { key: 'g', ref: flagG },
  { key: 'i', ref: flagI },
  { key: 'm', ref: flagM },
  { key: 's', ref: flagS },
  { key: 'u', ref: flagU },
]
</script>

<template>
  <div class="regexpad">
    <div class="card">
      <div class="row">
        <label class="field grow">
          <span>{{ t('regexpad.pattern') }}</span>
          <input
            v-model="pattern"
            type="text"
            class="mono"
            spellcheck="false"
            :placeholder="t('regexpad.patternPlaceholder')"
          />
        </label>
        <div class="field flags-field">
          <span>{{ t('regexpad.flags.label') }}</span>
          <div class="flags">
            <label v-for="f in flagDefs" :key="f.key" class="flag-chk">
              <input v-model="f.ref.value" type="checkbox" />
              <code>{{ f.key }}</code>
              <span class="flag-name">{{ t(`regexpad.flags.${f.key}`) }}</span>
            </label>
          </div>
        </div>
      </div>
      <label class="field">
        <span>{{ t('regexpad.replacement') }}</span>
        <input
          v-model="replacement"
          type="text"
          class="mono"
          spellcheck="false"
          :placeholder="t('regexpad.replacementPlaceholder')"
        />
      </label>
      <p class="hint">{{ t('regexpad.replacementHint') }}</p>
      <p v-if="regexResult.error" class="error">
        {{ t('regexpad.errors.invalidRegex') }}: <code>{{ regexResult.error }}</code>
      </p>
    </div>

    <div class="card">
      <header class="head">
        <span class="title">{{ t('regexpad.source') }}</span>
        <div class="head-actions">
          <button class="btn btn-ghost btn-sm" type="button" @click="loadExample">
            {{ t('regexpad.actions.example') }}
          </button>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="source.length === 0 && pattern.length === 0"
            @click="clear"
          >
            {{ t('regexpad.actions.clear') }}
          </button>
        </div>
      </header>
      <textarea
        v-model="source"
        class="editor"
        spellcheck="false"
        :placeholder="t('regexpad.sourcePlaceholder')"
      />
    </div>

    <div class="card">
      <header class="head">
        <span class="title">{{ t('regexpad.preview') }}</span>
        <span class="matches-count">
          <template v-if="!regexResult.regex">{{ t('regexpad.matches.idle') }}</template>
          <template v-else-if="matches.length === 0">{{ t('regexpad.matches.none') }}</template>
          <template v-else>{{ t('regexpad.matches.count', { n: matches.length }) }}</template>
        </span>
      </header>
      <div
        class="preview"
        :class="{ 'is-empty': source.length === 0 }"
        v-html="source.length === 0 ? t('regexpad.previewEmpty') : highlight"
      />
    </div>

    <div class="card">
      <header class="head">
        <span class="title">{{ t('regexpad.output') }}</span>
        <div class="head-actions">
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="replaceResult.output.length === 0"
            @click="copyOutput"
          >
            {{ copied ? t('regexpad.actions.copied') : t('regexpad.actions.copy') }}
          </button>
          <button
            class="btn btn-sm"
            type="button"
            :disabled="replaceResult.output.length === 0"
            @click="download"
          >
            {{ t('regexpad.actions.download') }}
          </button>
        </div>
      </header>
      <textarea
        class="editor"
        readonly
        :value="replaceResult.output"
        :placeholder="t('regexpad.outputPlaceholder')"
      />
    </div>
  </div>
</template>

<style scoped>
.regexpad {
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
  flex: 1 1 280px;
}
.flags-field {
  flex: 0 0 auto;
}
.flags {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.4rem 0.6rem;
  align-items: center;
}
.flag-chk {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.82rem;
  cursor: pointer;
}
.flag-chk code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 600;
}
.flag-name {
  color: var(--muted);
}
.field input,
.field textarea {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.88rem;
}
.hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}
.error {
  margin: 0;
  color: #b53a1f;
  font-size: 0.88rem;
}
.error code {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.82rem;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
.matches-count {
  font-size: 0.85rem;
  color: var(--muted);
}
.editor {
  width: 100%;
  min-height: 14rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.88rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  resize: vertical;
  white-space: pre-wrap;
}
.preview {
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.7rem 0.85rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.88rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  min-height: 6rem;
  max-height: 20rem;
  overflow: auto;
}
.preview.is-empty {
  color: var(--muted);
}
.preview :deep(mark) {
  background: #fce8a4;
  color: inherit;
  padding: 0 0.1rem;
  border-radius: 3px;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
