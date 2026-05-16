<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.gradienty.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.gradienty.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.gradienty.tagline') }}</h1>
      <p class="lead">{{ t('tools.gradienty.description') }}</p>
    </header>

    <Gradienty />
  </section>
</template>
