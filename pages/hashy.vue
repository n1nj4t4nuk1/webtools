<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.hashy.name')} · Tanukibox`,
  meta: [
    { name: 'description', content: () => t('tools.hashy.description') },
  ],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.hashy.tagline') }}</h1>
      <p class="lead">{{ t('tools.hashy.description') }}</p>
    </header>

    <HashCalculator />
  </section>
</template>
