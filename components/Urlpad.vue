<script setup lang="ts">
/**
 * Urlpad.vue
 *
 * Single-pane URL encoder/decoder with three direction modes (auto,
 * encode, decode) and two variants (component vs full URI). Edits run
 * through `useUrlpad.transform`; the badge shows which direction was
 * applied so the user can tell when auto-detection switched modes.
 */
import type { UrlpadDirection, UrlpadVariant } from '~/composables/useUrlpad'

const { t } = useI18n()
const { transform } = useUrlpad()

const input = ref('')
const direction = ref<UrlpadDirection>('auto')
const variant = ref<UrlpadVariant>('component')
const copied = ref(false)

const result = computed(() => transform(input.value, direction.value, variant.value))

const detectedLabel = computed(() => {
  if (input.value.length === 0) return ''
  return t(`urlpad.detected.${result.value.effective}`)
})

const swap = () => {
  if (result.value.output.length === 0) return
  input.value = result.value.output
}

const copyOutput = async () => {
  if (result.value.output.length === 0) return
  try {
    await navigator.clipboard.writeText(result.value.output)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // silent
  }
}

const download = () => {
  if (result.value.output.length === 0) return
  const blob = new Blob([result.value.output], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'urlpad.txt'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const loadExample = () => {
  if (result.value.effective === 'decode' && direction.value !== 'encode') {
    input.value = 'https://example.com/path?name=Mar%C3%ADa%20P%C3%A9rez&city=Madrid'
  } else {
    input.value = 'https://example.com/path?name=María Pérez&city=Madrid'
  }
}

const clear = () => {
  input.value = ''
}

const directionOptions: UrlpadDirection[] = ['auto', 'encode', 'decode']
const variantOptions: UrlpadVariant[] = ['component', 'uri']
</script>

<template>
  <div class="urlpad">
    <div class="card options">
      <div class="row">
        <label class="field grow">
          <span>{{ t('urlpad.direction.label') }}</span>
          <select v-model="direction">
            <option v-for="d in directionOptions" :key="d" :value="d">
              {{ t(`urlpad.direction.${d}`) }}
            </option>
          </select>
        </label>
        <label class="field grow">
          <span>{{ t('urlpad.variant.label') }}</span>
          <select v-model="variant">
            <option v-for="v in variantOptions" :key="v" :value="v">
              {{ t(`urlpad.variant.${v}`) }}
            </option>
          </select>
        </label>
        <span v-if="detectedLabel" class="detected">
          {{ t('urlpad.detected.label') }}: <strong>{{ detectedLabel }}</strong>
        </span>
      </div>
      <p class="hint">{{ t(`urlpad.variant.${variant}Hint`) }}</p>
    </div>

    <div class="panes">
      <div class="pane card">
        <header class="pane-head">
          <span class="pane-title">{{ t('urlpad.input') }}</span>
          <div class="pane-actions">
            <button class="btn btn-ghost btn-sm" type="button" @click="loadExample">
              {{ t('urlpad.actions.example') }}
            </button>
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              :disabled="input.length === 0"
              @click="clear"
            >
              {{ t('urlpad.actions.clear') }}
            </button>
          </div>
        </header>
        <textarea
          v-model="input"
          class="editor"
          spellcheck="false"
          :placeholder="t('urlpad.inputPlaceholder')"
        />
      </div>

      <div class="pane card">
        <header class="pane-head">
          <span class="pane-title">{{ t('urlpad.output') }}</span>
          <div class="pane-actions">
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              :disabled="result.output.length === 0"
              @click="swap"
            >
              ↑ {{ t('urlpad.actions.useAsInput') }}
            </button>
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              :disabled="result.output.length === 0"
              @click="copyOutput"
            >
              {{ copied ? t('urlpad.actions.copied') : t('urlpad.actions.copy') }}
            </button>
            <button
              class="btn btn-sm"
              type="button"
              :disabled="result.output.length === 0"
              @click="download"
            >
              {{ t('urlpad.actions.download') }}
            </button>
          </div>
        </header>
        <textarea
          v-if="!result.error"
          class="editor"
          spellcheck="false"
          readonly
          :value="result.output"
          :placeholder="t('urlpad.outputPlaceholder')"
        />
        <p v-else class="error">
          {{ t('urlpad.errors.decode') }}: <code>{{ result.error }}</code>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.urlpad {
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
  flex: 1 1 180px;
}
.field select {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
}
.detected {
  font-size: 0.82rem;
  color: var(--muted);
  margin-left: auto;
}
.hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
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
  min-height: 16rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  resize: vertical;
  white-space: pre-wrap;
  word-break: break-all;
}
.error {
  margin: 0;
  color: #b53a1f;
  font-size: 0.9rem;
  padding: 0.7rem 0.85rem;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  min-height: 16rem;
  white-space: pre-wrap;
}
.error code {
  background: rgba(0, 0, 0, 0.05);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-size: 0.82rem;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
