<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.jwtdecoder.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.jwtdecoder.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.jwtdecoder.tagline') }}</h1>
      <p class="lead">{{ t('tools.jwtdecoder.description') }}</p>
    </header>

    <JwtDecoder />
  </section>
</template>
