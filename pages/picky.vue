<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `TanukiBox · ${t('tools.picky.name')}`,
  meta: [{ name: 'description', content: () => t('tools.picky.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.picky.tagline') }}</h1>
      <p class="lead">{{ t('tools.picky.description') }}</p>
    </header>

    <Picky />
  </section>
</template>
