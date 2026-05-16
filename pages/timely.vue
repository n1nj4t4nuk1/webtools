<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.timely.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.timely.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.timely.tagline') }}</h1>
      <p class="lead">{{ t('tools.timely.description') }}</p>
    </header>

    <Timely />
  </section>
</template>
