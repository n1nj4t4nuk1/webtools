<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.albumy.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.albumy.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.albumy.tagline') }}</h1>
      <p class="lead">{{ t('tools.albumy.description') }}</p>
    </header>

    <Albumy />
  </section>
</template>
