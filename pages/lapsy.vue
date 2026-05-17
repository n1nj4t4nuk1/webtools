<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `TanukiBox · ${t('tools.lapsy.name')}`,
  meta: [{ name: 'description', content: () => t('tools.lapsy.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.lapsy.tagline') }}</h1>
      <p class="lead">{{ t('tools.lapsy.description') }}</p>
    </header>

    <Lapsy />
  </section>
</template>
