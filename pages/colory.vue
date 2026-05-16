<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.colory.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.colory.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.colory.tagline') }}</h1>
      <p class="lead">{{ t('tools.colory.description') }}</p>
    </header>

    <Colory />
  </section>
</template>
