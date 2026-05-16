<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.codecpad.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.codecpad.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.codecpad.tagline') }}</h1>
      <p class="lead">{{ t('tools.codecpad.description') }}</p>
    </header>

    <Codecpad />
  </section>
</template>
