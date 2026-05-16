<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.wordy.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.wordy.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.wordy.tagline') }}</h1>
      <p class="lead">{{ t('tools.wordy.description') }}</p>
    </header>

    <WordyCounter />
  </section>
</template>
