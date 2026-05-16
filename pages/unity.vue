<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `${t('tools.unity.name')} · Tanukibox`,
  meta: [{ name: 'description', content: () => t('tools.unity.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.unity.tagline') }}</h1>
      <p class="lead">{{ t('tools.unity.description') }}</p>
    </header>

    <Unity />
  </section>
</template>
