<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `TanukiBox · ${t('tools.stapler.name')}`,
  meta: [{ name: 'description', content: () => t('tools.stapler.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.stapler.tagline') }}</h1>
      <p class="lead">{{ t('tools.stapler.description') }}</p>
    </header>

    <PdfStapler />
  </section>
</template>
