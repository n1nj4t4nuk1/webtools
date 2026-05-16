<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.urlpad.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.urlpad.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.urlpad.tagline') }}</h1>
      <p class="lead">{{ t('tools.urlpad.description') }}</p>
    </header>

    <Urlpad />
  </section>
</template>
