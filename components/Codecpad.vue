<script setup lang="ts">
import type { CodecId } from '~/composables/useCodecpad'
import { ALL_CODECS, DEFAULT_ACTIVE } from '~/composables/useCodecpad'

const { t } = useI18n()
const { toBytes, fromBytes } = useCodecpad()

const active = ref<CodecId[]>([...DEFAULT_ACTIVE])
const sourceId = ref<CodecId>('utf8')
const sourceValue = ref('Hello, world!')
const copiedId = ref<CodecId | null>(null)
const pickerOpen = ref(false)

const sourceBytes = computed<Uint8Array | null>(() =>
  toBytes(sourceValue.value, sourceId.value),
)

const sourceValid = computed(() => sourceBytes.value !== null)

const valueFor = (codec: CodecId): string => {
  if (codec === sourceId.value) return sourceValue.value
  const bytes = sourceBytes.value
  if (bytes === null) return ''
  return fromBytes(bytes, codec) ?? ''
}

const isNonRepresentable = (codec: CodecId): boolean => {
  if (codec === sourceId.value) return false
  const bytes = sourceBytes.value
  if (bytes === null) return false
  return fromBytes(bytes, codec) === null
}

const onInput = (codec: CodecId, raw: string) => {
  sourceId.value = codec
  sourceValue.value = raw
}

const inactiveCodecs = computed(() => ALL_CODECS.filter((c) => !active.value.includes(c)))

const addCodec = (codec: CodecId) => {
  if (!active.value.includes(codec)) active.value.push(codec)
  pickerOpen.value = false
}

const removeCodec = (codec: CodecId) => {
  if (codec === 'utf8') return
  active.value = active.value.filter((c) => c !== codec)
  if (sourceId.value === codec) sourceId.value = 'utf8'
}

const copy = async (codec: CodecId) => {
  const value = valueFor(codec)
  if (value.length === 0 && codec !== sourceId.value) return
  try {
    await navigator.clipboard.writeText(value)
    copiedId.value = codec
    setTimeout(() => {
      if (copiedId.value === codec) copiedId.value = null
    }, 1500)
  } catch {
    // silent
  }
}

const clear = () => {
  sourceValue.value = ''
}
</script>

<template>
  <div class="codecpad">
    <div class="card">
      <header class="head">
        <span class="title">{{ t('codecpad.title') }}</span>
        <button class="btn btn-ghost btn-sm" type="button" @click="clear">
          {{ t('codecpad.actions.clear') }}
        </button>
      </header>

      <ul class="codec-list">
        <li v-for="codec in active" :key="codec" class="codec-row">
          <span class="codec-label mono">{{ t(`codecpad.codecs.${codec}`) }}</span>
          <textarea
            :value="valueFor(codec)"
            spellcheck="false"
            class="value-input mono"
            :class="{
              'is-err': sourceId === codec && !sourceValid && sourceValue.length > 0,
              'is-warn': isNonRepresentable(codec),
            }"
            rows="2"
            :placeholder="isNonRepresentable(codec) ? t('codecpad.errors.nonRepresentable') : ''"
            @input="onInput(codec, ($event.target as HTMLTextAreaElement).value)"
          />
          <div class="row-actions">
            <button
              class="btn btn-ghost btn-sm"
              type="button"
              :disabled="valueFor(codec).length === 0"
              @click="copy(codec)"
            >
              {{ copiedId === codec ? t('codecpad.actions.copied') : t('codecpad.actions.copy') }}
            </button>
            <button
              v-if="codec !== 'utf8'"
              type="button"
              class="btn-icon"
              :title="t('codecpad.actions.removeCodec')"
              @click="removeCodec(codec)"
            >×</button>
          </div>
        </li>
      </ul>

      <p v-if="!sourceValid && sourceValue.length > 0" class="error">
        {{ t('codecpad.errors.invalid', { codec: t(`codecpad.codecs.${sourceId}`) }) }}
      </p>
    </div>

    <div v-if="inactiveCodecs.length > 0" class="card add-card">
      <header class="head">
        <span class="title">{{ t('codecpad.addCodec.title') }}</span>
        <button
          class="btn btn-ghost btn-sm"
          type="button"
          @click="pickerOpen = !pickerOpen"
        >
          + {{ t('codecpad.actions.addCodec') }}
        </button>
      </header>
      <div v-if="pickerOpen" class="picker">
        <button
          v-for="codec in inactiveCodecs"
          :key="codec"
          type="button"
          class="picker-item"
          @click="addCodec(codec)"
        >
          <strong>{{ t(`codecpad.codecs.${codec}`) }}</strong>
          <span class="picker-desc">{{ t(`codecpad.descriptions.${codec}`) }}</span>
        </button>
      </div>
      <p v-else class="hint">{{ t('codecpad.addCodec.hint') }}</p>
    </div>
  </div>
</template>

<style scoped>
.codecpad {
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
  gap: 0.5rem;
}
.title {
  font-weight: 600;
  font-size: 0.95rem;
}
.codec-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.codec-row {
  display: grid;
  grid-template-columns: 8rem 1fr auto;
  gap: 0.5rem;
  align-items: start;
}
@media (max-width: 700px) {
  .codec-row {
    grid-template-columns: 1fr;
  }
}
.codec-label {
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.45rem 0.65rem;
  font-weight: 600;
  font-size: 0.85rem;
  text-align: center;
}
.value-input {
  width: 100%;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font: inherit;
  font-size: 0.85rem;
  resize: vertical;
  min-height: 2.4rem;
  white-space: pre-wrap;
  word-break: break-all;
}
.value-input.is-err {
  border-color: #c84a2e;
  background: #fdf1ee;
}
.value-input.is-warn {
  background: #fbf8e8;
  color: var(--muted);
  font-style: italic;
}
.row-actions {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
}
.btn-icon {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  width: 1.8rem;
  height: 1.8rem;
  cursor: pointer;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.error {
  margin: 0;
  color: #b53a1f;
  font-size: 0.85rem;
}
.add-card {
  gap: 0.6rem;
}
.hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}
.picker {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.5rem;
}
.picker-item {
  text-align: left;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.65rem 0.85rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font: inherit;
}
.picker-item:hover {
  border-color: var(--accent, #888);
}
.picker-desc {
  font-size: 0.78rem;
  color: var(--muted);
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
