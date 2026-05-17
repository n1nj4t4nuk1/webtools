<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `TanukiBox · ${t('tools.pixely.name')}`,
  meta: [{ name: 'description', content: () => t('tools.pixely.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.pixely.tagline') }}</h1>
      <p class="lead">{{ t('tools.pixely.description') }}</p>
    </header>

    <Pixely />
  </section>
</template>
