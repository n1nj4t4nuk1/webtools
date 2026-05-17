<script setup lang="ts">
const { t } = useI18n()

const sectionKeys = ['acceptance', 'service', 'use', 'responsibility', 'ip', 'liability', 'changes', 'jurisdiction'] as const

useHead({
  title: () => `TanukiBox · ${t('legal.terms.title')}`,
  meta: [{ name: 'robots', content: 'index, follow' }],
})
</script>

<template>
  <article class="legal">
    <header class="page-header">
      <h1>{{ t('legal.terms.title') }}</h1>
      <p class="last-updated">{{ t('legal.lastUpdated') }}</p>
    </header>

    <p class="lead" v-html="t('legal.terms.intro')" />

    <section v-for="key in sectionKeys" :key="key" class="legal-section">
      <h2>{{ t(`legal.terms.sections.${key}.title`) }}</h2>
      <div class="prose" v-html="t(`legal.terms.sections.${key}.body`)" />
    </section>
  </article>
</template>
