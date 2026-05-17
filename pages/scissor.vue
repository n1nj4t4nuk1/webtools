<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `TanukiBox · ${t('tools.scissor.name')}`,
  meta: [{ name: 'description', content: () => t('tools.scissor.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.scissor.tagline') }}</h1>
      <p class="lead">{{ t('tools.scissor.description') }}</p>
    </header>

    <PdfScissor />
  </section>
</template>
