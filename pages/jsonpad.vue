<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.jsonpad.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.jsonpad.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.jsonpad.tagline') }}</h1>
      <p class="lead">{{ t('tools.jsonpad.description') }}</p>
    </header>

    <Jsonpad />
  </section>
</template>
