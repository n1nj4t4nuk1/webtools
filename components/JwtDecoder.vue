<script setup lang="ts">
/**
 * JwtDecoder.vue
 *
 * Pastes a JWT, splits it into header / payload / signature via
 * `useJwtDecoder.parse` and renders each part. The standard time claims
 * (`exp`, `nbf`, `iat`) get both an absolute date and a relative phrase
 * ("in 2 hours") in the user's locale, plus a status badge (valid,
 * expired, not-yet-valid).
 */
import { STANDARD_CLAIMS } from '~/composables/useJwtDecoder'

const { t, locale } = useI18n()
const { parse, isTimeClaim, formatTimestamp, relativeTime, tokenStatus } = useJwtDecoder()

const input = ref('')
const copiedKey = ref<string | null>(null)

const result = computed(() => parse(input.value))

const headerJson = computed(() =>
  result.value.header !== null ? JSON.stringify(result.value.header, null, 2) : '',
)

const payloadJson = computed(() =>
  result.value.payload !== null ? JSON.stringify(result.value.payload, null, 2) : '',
)

const status = computed(() => tokenStatus(result.value.payload))

const standardClaims = computed(() => {
  if (!result.value.payload || typeof result.value.payload !== 'object') return []
  const p = result.value.payload as Record<string, unknown>
  return STANDARD_CLAIMS.filter((k) => k in p).map((key) => ({
    key,
    value: p[key],
    time: isTimeClaim(key),
  }))
})

const customClaims = computed(() => {
  if (!result.value.payload || typeof result.value.payload !== 'object') return []
  const p = result.value.payload as Record<string, unknown>
  const standard = new Set(STANDARD_CLAIMS)
  return Object.keys(p).filter((k) => !standard.has(k))
})

const copy = async (text: string, key: string) => {
  if (text.length === 0) return
  try {
    await navigator.clipboard.writeText(text)
    copiedKey.value = key
    setTimeout(() => {
      if (copiedKey.value === key) copiedKey.value = null
    }, 1500)
  } catch {
    // silent
  }
}

const loadExample = () => {
  input.value =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMzQ1IiwibmFtZSI6Ik1hcsOtYSBQw6lyZXoiLCJpc3MiOiJodHRwczovL3RhbnVraWJveC5jb20iLCJpYXQiOjE3MTY3NDg4MDAsImV4cCI6MTcxNjgzNTIwMH0.aGVsbG8td29ybGQtZmFrZS1zaWduYXR1cmU'
}

const clear = () => {
  input.value = ''
}

const errorMessage = computed(() => {
  if (!result.value.error || result.value.error === 'EMPTY') return null
  return t(`jwtdecoder.errors.${result.value.error}`)
})

const formatValue = (value: unknown, isTime: boolean) => {
  if (isTime && typeof value === 'number') {
    const abs = formatTimestamp(value, locale.value)
    const rel = relativeTime(value, locale.value)
    return rel ? `${abs} (${rel})` : abs
  }
  if (typeof value === 'object' && value !== null) return JSON.stringify(value)
  return String(value)
}
</script>

<template>
  <div class="jwtdecoder">
    <div class="card">
      <header class="head">
        <span class="title">{{ t('jwtdecoder.token') }}</span>
        <div class="head-actions">
          <button class="btn btn-ghost btn-sm" type="button" @click="loadExample">
            {{ t('jwtdecoder.actions.example') }}
          </button>
          <button
            class="btn btn-ghost btn-sm"
            type="button"
            :disabled="input.length === 0"
            @click="clear"
          >
            {{ t('jwtdecoder.actions.clear') }}
          </button>
        </div>
      </header>
      <textarea
        v-model="input"
        class="editor mono"
        spellcheck="false"
        :placeholder="t('jwtdecoder.placeholder')"
        rows="4"
      />
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </div>

    <div v-if="result.valid" class="status" :class="`status-${status}`">
      <span class="status-dot"></span>
      <span>{{ t(`jwtdecoder.status.${status}`) }}</span>
    </div>

    <div v-if="result.header !== null" class="card">
      <header class="head">
        <span class="title">{{ t('jwtdecoder.header') }}</span>
        <button class="btn btn-ghost btn-sm" type="button" @click="copy(headerJson, 'header')">
          {{ copiedKey === 'header' ? t('jwtdecoder.actions.copied') : t('jwtdecoder.actions.copy') }}
        </button>
      </header>
      <pre class="json mono">{{ headerJson }}</pre>
    </div>

    <div v-if="result.payload !== null" class="card">
      <header class="head">
        <span class="title">{{ t('jwtdecoder.payload') }}</span>
        <button class="btn btn-ghost btn-sm" type="button" @click="copy(payloadJson, 'payload')">
          {{ copiedKey === 'payload' ? t('jwtdecoder.actions.copied') : t('jwtdecoder.actions.copy') }}
        </button>
      </header>
      <pre class="json mono">{{ payloadJson }}</pre>

      <div v-if="standardClaims.length > 0" class="claims">
        <h3 class="claims-title">{{ t('jwtdecoder.standardClaims') }}</h3>
        <ul class="claim-list">
          <li v-for="claim in standardClaims" :key="claim.key" class="claim-row">
            <div class="claim-meta">
              <code class="claim-key">{{ claim.key }}</code>
              <span class="claim-name">{{ t(`jwtdecoder.claims.${claim.key}`) }}</span>
            </div>
            <span class="claim-value">{{ formatValue(claim.value, claim.time) }}</span>
          </li>
        </ul>
      </div>

      <div v-if="customClaims.length > 0" class="claims-note">
        {{ t('jwtdecoder.customClaims', { n: customClaims.length }) }}
      </div>
    </div>

    <div v-if="result.valid && result.signature.length > 0" class="card">
      <header class="head">
        <span class="title">{{ t('jwtdecoder.signature') }}</span>
        <button class="btn btn-ghost btn-sm" type="button" @click="copy(result.signature, 'sig')">
          {{ copiedKey === 'sig' ? t('jwtdecoder.actions.copied') : t('jwtdecoder.actions.copy') }}
        </button>
      </header>
      <pre class="json mono">{{ result.signature }}</pre>
      <p class="hint">{{ t('jwtdecoder.signatureHint') }}</p>
    </div>
  </div>
</template>

<style scoped>
.jwtdecoder {
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
  flex-wrap: wrap;
}
.title {
  font-weight: 600;
  font-size: 0.95rem;
}
.head-actions {
  display: inline-flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}
.editor {
  width: 100%;
  min-height: 5.5rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg, #fff);
  font-size: 0.82rem;
  resize: vertical;
  white-space: pre-wrap;
  word-break: break-all;
}
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.json {
  margin: 0;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.7rem 0.85rem;
  font-size: 0.85rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.error {
  margin: 0;
  color: #b53a1f;
  font-size: 0.88rem;
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
.status-dot {
  display: inline-block;
  width: 0.6rem;
  height: 0.6rem;
  border-radius: 50%;
  flex-shrink: 0;
}
.status-valid {
  background: #f0f7ee;
  border-color: #cfe3c7;
  color: #2b5c1c;
}
.status-valid .status-dot { background: #4a9d2f; }
.status-expired {
  background: #fdf1ee;
  border-color: #f0c6bc;
  color: #8a2914;
}
.status-expired .status-dot { background: #c84a2e; }
.status-notYet {
  background: #fbf8e8;
  border-color: #ebe3a1;
  color: #6e5a00;
}
.status-notYet .status-dot { background: #c8a52e; }
.status-unknown {
  background: var(--surface);
  color: var(--muted);
}
.status-unknown .status-dot { background: #aaa; }
.claims {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--border);
}
.claims-title {
  margin: 0;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  font-weight: 600;
}
.claim-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.claim-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.5rem;
  align-items: baseline;
  padding: 0.45rem 0.6rem;
  background: var(--bg, #fff);
  border: 1px solid var(--border);
  border-radius: 6px;
}
@media (max-width: 600px) {
  .claim-row {
    grid-template-columns: 1fr;
  }
}
.claim-meta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}
.claim-key {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 600;
  font-size: 0.85rem;
}
.claim-name {
  color: var(--muted);
  font-size: 0.82rem;
}
.claim-value {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
  word-break: break-all;
  text-align: right;
}
@media (max-width: 600px) {
  .claim-value {
    text-align: left;
  }
}
.claims-note {
  font-size: 0.82rem;
  color: var(--muted);
}
.hint {
  margin: 0;
  font-size: 0.82rem;
  color: var(--muted);
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
</style>
