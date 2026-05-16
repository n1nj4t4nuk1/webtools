<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.lorempad.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.lorempad.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.lorempad.tagline') }}</h1>
      <p class="lead">{{ t('tools.lorempad.description') }}</p>
    </header>

    <Lorempad />
  </section>
</template>
