<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.metaimg.name')} · Tanukibox`,
  meta: [
    { name: 'description', content: () => t('tools.metaimg.description') },
  ],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.metaimg.tagline') }}</h1>
      <p class="lead">{{ t('tools.metaimg.description') }}</p>
    </header>

    <MetaimgEditor />
  </section>
</template>
