<script setup lang="ts">
const { t } = useI18n()

const sectionKeys = ['scope', 'data', 'cookies', 'tracking', 'gdpr', 'children', 'changes', 'contact'] as const

useHead({
  title: () => `${t('legal.privacy.title')} · Tanukibox`,
  meta: [{ name: 'robots', content: 'index, follow' }],
})
</script>

<template>
  <article class="legal">
    <header class="page-header">
      <h1>{{ t('legal.privacy.title') }}</h1>
      <p class="last-updated">{{ t('legal.lastUpdated') }}</p>
    </header>

    <p class="lead" v-html="t('legal.privacy.intro')" />

    <section v-for="key in sectionKeys" :key="key" class="legal-section">
      <h2>{{ t(`legal.privacy.sections.${key}.title`) }}</h2>
      <div class="prose" v-html="t(`legal.privacy.sections.${key}.body`)" />
    </section>
  </article>
</template>
