<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `TanukiBox · ${t('tools.mochi.name')}`,
  meta: [
    { name: 'description', content: () => t('tools.mochi.description') },
  ],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.mochi.tagline') }}</h1>
      <p class="lead">{{ t('tools.mochi.description') }}</p>
    </header>

    <ImageResizer />
  </section>
</template>
