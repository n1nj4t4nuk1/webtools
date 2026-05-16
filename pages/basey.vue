<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.basey.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.basey.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.basey.tagline') }}</h1>
      <p class="lead">{{ t('tools.basey.description') }}</p>
    </header>

    <Basey />
  </section>
</template>
