<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `TanukiBox · ${t('tools.diffy.name')}`,
  meta: [{ name: 'description', content: () => t('tools.diffy.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.diffy.tagline') }}</h1>
      <p class="lead">{{ t('tools.diffy.description') }}</p>
    </header>

    <Diffy />
  </section>
</template>
