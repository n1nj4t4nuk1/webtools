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
        <span class="brand-mark">TanukiBox</span>
        <span class="brand-sub">WebTools</span>
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
      <small class="footer-tagline">{{ t('footer.tagline') }}</small>
      <nav class="footer-links" :aria-label="t('footer.legalLinks')">
        <NuxtLink :to="useLocalePath()('/privacy')">{{ t('footer.privacy') }}</NuxtLink>
        <NuxtLink :to="useLocalePath()('/terms')">{{ t('footer.terms') }}</NuxtLink>
        <NuxtLink :to="useLocalePath()('/cookies')">{{ t('footer.cookies') }}</NuxtLink>
      </nav>
    </footer>
  </div>
</template>
