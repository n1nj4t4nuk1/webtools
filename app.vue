<script setup lang="ts">
const { locale, locales, setLocale, t } = useI18n()
const localePath = useLocalePath()

type LocaleOption = { code: string; name: string }

const allLocales = computed(() => locales.value as LocaleOption[])

const onChangeLocale = (event: Event) => {
  const target = event.target as HTMLSelectElement
  setLocale(target.value as never)
}
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <NuxtLink :to="localePath('/')" class="brand">
        <span class="brand-mark">tanukibox</span>
      </NuxtLink>

      <label class="lang-switcher" :aria-label="t('nav.languageSwitcher')">
        <span class="lang-icon" aria-hidden="true">🌐</span>
        <select
          class="lang-select"
          :value="locale"
          @change="onChangeLocale"
        >
          <option v-for="l in allLocales" :key="l.code" :value="l.code">
            {{ l.name }}
          </option>
        </select>
      </label>
    </header>

    <main class="app-main">
      <NuxtPage />
    </main>

    <footer class="app-footer">
      <small>{{ t('footer.tagline') }}</small>
    </footer>
  </div>
</template>
