<script setup lang="ts">
import type { PasswordOptions, StrengthBucket } from '~/composables/usePasswordGenerator'

const { t } = useI18n()
const { generate, entropyBits, strength } = usePasswordGenerator()

const options = reactive<PasswordOptions>({
  length: 20,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeSimilar: false,
  excludeAmbiguous: false,
})

const password = ref('')
const errorMessage = ref<string | null>(null)
const copied = ref(false)
const count = ref(1)
const passwords = ref<string[]>([])

const bits = computed(() => entropyBits(options))
const bucket = computed<StrengthBucket>(() => strength(bits.value))

const noSetSelected = computed(
  () => !options.uppercase && !options.lowercase && !options.numbers && !options.symbols,
)

const onGenerate = () => {
  errorMessage.value = null
  copied.value = false
  if (noSetSelected.value) {
    errorMessage.value = t('createpass.errors.noCharset')
    passwords.value = []
    password.value = ''
    return
  }
  try {
    const list: string[] = []
    for (let i = 0; i < count.value; i++) list.push(generate(options))
    passwords.value = list
    password.value = list[0]
  } catch (err) {
    errorMessage.value = (err as Error).message
  }
}

const onCopy = async (value: string) => {
  try {
    await navigator.clipboard.writeText(value)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    errorMessage.value = t('createpass.errors.clipboard')
  }
}

onMounted(onGenerate)
</script>

<template>
  <div class="createpass">
    <div class="card config">
      <div class="row">
        <label class="field grow">
          <span>{{ t('createpass.length') }} ({{ options.length }})</span>
          <input
            v-model.number="options.length"
            type="range"
            min="4"
            max="64"
          />
        </label>
        <label class="field">
          <span>{{ t('createpass.count') }}</span>
          <input v-model.number="count" type="number" min="1" max="20" />
        </label>
      </div>

      <div class="checks">
        <label class="chk">
          <input v-model="options.uppercase" type="checkbox" />
          <span>A–Z</span>
        </label>
        <label class="chk">
          <input v-model="options.lowercase" type="checkbox" />
          <span>a–z</span>
        </label>
        <label class="chk">
          <input v-model="options.numbers" type="checkbox" />
          <span>0–9</span>
        </label>
        <label class="chk">
          <input v-model="options.symbols" type="checkbox" />
          <span>!@#$…</span>
        </label>
        <label class="chk">
          <input v-model="options.excludeSimilar" type="checkbox" />
          <span>{{ t('createpass.excludeSimilar') }}</span>
        </label>
        <label class="chk">
          <input v-model="options.excludeAmbiguous" type="checkbox" />
          <span>{{ t('createpass.excludeAmbiguous') }}</span>
        </label>
      </div>

      <div class="actions">
        <div class="strength">
          <span class="strength-label">{{ t(`createpass.strength.${bucket}`) }}</span>
          <span class="strength-bits">{{ bits }} {{ t('createpass.bits') }}</span>
          <span class="strength-bar" :class="`bar-${bucket}`"></span>
        </div>
        <button class="btn" type="button" @click="onGenerate">
          {{ t('createpass.actions.generate') }}
        </button>
      </div>
    </div>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <ul v-if="passwords.length" class="password-list">
      <li v-for="(p, i) in passwords" :key="i" class="password-row">
        <code class="password-text">{{ p }}</code>
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          @click="onCopy(p)"
        >
          {{ copied && passwords.length === 1 ? t('createpass.actions.copied') : t('createpass.actions.copy') }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.createpass {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
.config {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}
.field.grow {
  flex: 1 1 280px;
}
.field input[type='number'] {
  width: 5rem;
}
.checks {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.5rem 1rem;
}
.chk {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.strength {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
}
.strength-label {
  font-weight: 600;
}
.strength-bits {
  color: var(--muted);
}
.strength-bar {
  display: inline-block;
  width: 80px;
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  position: relative;
  overflow: hidden;
}
.strength-bar::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--accent);
  transform-origin: left;
}
.bar-veryWeak::after { transform: scaleX(0.1); background: #c44; }
.bar-weak::after { transform: scaleX(0.3); background: #d77; }
.bar-reasonable::after { transform: scaleX(0.55); background: #d9a23a; }
.bar-strong::after { transform: scaleX(0.8); background: #6c8c4a; }
.bar-veryStrong::after { transform: scaleX(1); background: #4c8c4a; }

.password-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.password-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.85rem;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.password-text {
  flex: 1;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 1rem;
  word-break: break-all;
  user-select: all;
}
.btn-sm {
  padding: 0.3rem 0.7rem;
  font-size: 0.8rem;
}
.error {
  color: #b53a1f;
  margin: 0;
}
</style>
