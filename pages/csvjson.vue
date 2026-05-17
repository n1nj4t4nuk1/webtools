<script setup lang="ts">
const { t } = useI18n()

useHead({
  title: () => `TanukiBox · ${t('tools.csvjson.name')}`,
  meta: [{ name: 'description', content: () => t('tools.csvjson.description') }],
})
</script>

<template>
  <section class="page">
    <header class="page-header">
      <h1>{{ t('tools.csvjson.tagline') }}</h1>
      <p class="lead">{{ t('tools.csvjson.description') }}</p>
    </header>

    <CsvJson />
  </section>
</template>
