<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.regexpad.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.regexpad.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.regexpad.tagline') }}</h1>
      <p class="lead">{{ t('tools.regexpad.description') }}</p>
    </header>

    <Regexpad />
  </section>
</template>
