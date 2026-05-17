<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.qrgen.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.qrgen.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.qrgen.tagline') }}</h1>
      <p class="lead">{{ t('tools.qrgen.description') }}</p>
    </header>

    <Qrgen />
  </section>
</template>
