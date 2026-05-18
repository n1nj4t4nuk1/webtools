<script setup lang="ts">
/**
 * WordyCounter.vue (Wordy)
 *
 * Textarea + file upload that feed the same input string into
 * `useWordCount.compute`, plus a stats grid (words, characters with /
 * without spaces, lines, paragraphs, sentences, estimated reading time).
 * The reading-time display is localised via Intl.NumberFormat / units.
 */
const { t } = useI18n()
const { compute } = useWordCount()

type Mode = 'text' | 'file'

const mode = ref<Mode>('text')
const text = ref('')
const fileName = ref<string | null>(null)
const isDragging = ref(false)
const errorMessage = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

const stats = computed(() => compute(text.value))

const formatReadingTime = (seconds: number): string => {
  if (seconds < 60) return t('wordy.stats.seconds', { n: seconds })
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (s === 0) return t('wordy.stats.minutes', { n: m })
  return t('wordy.stats.minutesSeconds', { m, s })
}

const ACCEPTED_EXT = ['.txt', '.md', '.csv', '.log', '.json', '.xml', '.html', '.css', '.js', '.ts']

const isTextFile = (file: File): boolean => {
  if (file.type.startsWith('text/')) return true
  const lower = file.name.toLowerCase()
  return ACCEPTED_EXT.some((ext) => lower.endsWith(ext))
}

const readFile = async (file: File) => {
  errorMessage.value = null
  if (!isTextFile(file)) {
    errorMessage.value = t('wordy.errors.notText')
    return
  }
  try {
    const content = await file.text()
    text.value = content
    fileName.value = file.name
  } catch {
    errorMessage.value = t('wordy.errors.read')
  }
}

const onDrop = (event: DragEvent) => {
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) readFile(file)
}

const onSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) readFile(file)
  target.value = ''
}

const setMode = (m: Mode) => {
  mode.value = m
  errorMessage.value = null
  if (m === 'text') {
    fileName.value = null
  }
}

const clear = () => {
  text.value = ''
  fileName.value = null
  errorMessage.value = null
}
</script>

<template>
  <div class="wordy">
    <div class="mode-tabs">
      <button
        type="button"
        class="tab"
        :class="{ active: mode === 'text' }"
        @click="setMode('text')"
      >
        {{ t('wordy.modeText') }}
      </button>
      <button
        type="button"
        class="tab"
        :class="{ active: mode === 'file' }"
        @click="setMode('file')"
      >
        {{ t('wordy.modeFile') }}
      </button>
    </div>

    <textarea
      v-if="mode === 'text'"
      v-model="text"
      class="text-input"
      :placeholder="t('wordy.textPlaceholder')"
      rows="10"
    />

    <div v-else class="file-mode">
      <div
        class="dropzone"
        :class="{ active: isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
        @click="fileInput?.click()"
      >
        <p v-if="fileName">{{ fileName }}</p>
        <p v-else>{{ t('wordy.dropzone') }}</p>
        <input
          ref="fileInput"
          type="file"
          accept=".txt,.md,.csv,.log,.json,.xml,.html,.css,.js,.ts,text/*"
          hidden
          @change="onSelect"
        />
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div class="stats-grid">
      <div class="stat">
        <span class="stat-label">{{ t('wordy.stats.words') }}</span>
        <span class="stat-value">{{ stats.words.toLocaleString() }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">{{ t('wordy.stats.charsWithSpaces') }}</span>
        <span class="stat-value">{{ stats.charsWithSpaces.toLocaleString() }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">{{ t('wordy.stats.charsNoSpaces') }}</span>
        <span class="stat-value">{{ stats.charsNoSpaces.toLocaleString() }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">{{ t('wordy.stats.lines') }}</span>
        <span class="stat-value">{{ stats.lines.toLocaleString() }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">{{ t('wordy.stats.paragraphs') }}</span>
        <span class="stat-value">{{ stats.paragraphs.toLocaleString() }}</span>
      </div>
      <div class="stat">
        <span class="stat-label">{{ t('wordy.stats.sentences') }}</span>
        <span class="stat-value">{{ stats.sentences.toLocaleString() }}</span>
      </div>
      <div class="stat stat-wide">
        <span class="stat-label">{{ t('wordy.stats.readingTime') }}</span>
        <span class="stat-value">{{ formatReadingTime(stats.readingTimeSeconds) }}</span>
      </div>
    </div>

    <div v-if="text.length > 0" class="actions">
      <button class="btn btn-ghost btn-sm" type="button" @click="clear">
        {{ t('wordy.actions.clear') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.wordy {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.mode-tabs {
  display: inline-flex;
  gap: 0.25rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.2rem;
  align-self: flex-start;
}
.tab {
  background: transparent;
  border: none;
  padding: 0.4rem 0.85rem;
  font-size: 0.9rem;
  border-radius: calc(var(--radius) - 4px);
  cursor: pointer;
  color: var(--muted);
}
.tab.active {
  background: var(--bg, #fff);
  color: var(--text, inherit);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}
.text-input {
  width: 100%;
  font-family: inherit;
  font-size: 0.95rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  resize: vertical;
  min-height: 12rem;
}
.dropzone {
  border: 2px dashed var(--border);
  border-radius: var(--radius);
  padding: 2rem 1rem;
  text-align: center;
  cursor: pointer;
  color: var(--muted);
  transition: background 0.15s, border-color 0.15s;
}
.dropzone.active,
.dropzone:hover {
  background: var(--surface);
  border-color: var(--accent, #888);
}
.dropzone p {
  margin: 0;
  word-break: break-all;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.6rem;
}
.stat {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.7rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.stat-wide {
  grid-column: 1 / -1;
}
.stat-label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
}
.stat-value {
  font-size: 1.4rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.actions {
  display: flex;
  justify-content: flex-end;
}
.error {
  color: #b53a1f;
  margin: 0;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
