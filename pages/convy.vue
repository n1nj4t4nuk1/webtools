<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.convy.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.convy.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.convy.tagline') }}</h1>
      <p class="lead">{{ t('tools.convy.description') }}</p>
    </header>

    <Convy />
  </section>
</template>
